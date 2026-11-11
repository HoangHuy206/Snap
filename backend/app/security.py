"""Security helpers: SSRF protection, token hashing, filename sanitization, and rate limiting."""

from collections import defaultdict, deque
from pathlib import Path
from typing import Deque, Dict, Tuple
from urllib.parse import urlparse
import hashlib
import hmac
import ipaddress
import re
import secrets
import socket
import time

from fastapi import HTTPException, Request, status

SAFE_INLINE_MIME_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-m4v",
    "video/ogg",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/avif",
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "application/pdf",
}

CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"


def generate_short_code(length: int = 8) -> str:
    """Generate a URL-safe random code avoiding visually ambiguous characters."""
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def generate_edit_token() -> str:
    """Generate a cryptographically secure secret token for managing a Dynamic QR item."""
    return secrets.token_urlsafe(24)


def hash_token(token: str) -> str:
    """Compute SHA-256 hex digest for storing edit tokens safely."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_token(token: str, expected_hash: str) -> bool:
    """Constant-time token verification."""
    if not token or not expected_hash:
        return False
    return hmac.compare_digest(hash_token(token), expected_hash)


def sanitize_filename(filename: str) -> str:
    """Strip path traversal components and unsafe characters from user-supplied filenames."""
    base = Path(filename or "file").name
    cleaned = re.sub(r"[^\w.\- ()]", "_", base, flags=re.UNICODE).strip(" .")
    if not cleaned:
        return "file"
    return cleaned[:180]


def classify_media_kind(content_type: str, filename: str) -> str:
    """Classify uploaded file into video, image, audio, pdf, or generic file."""
    ct = (content_type or "").lower().split(";")[0].strip()
    ext = Path(filename or "").suffix.lower()

    if ct.startswith("video/") or ext in {".mp4", ".mov", ".webm", ".m4v", ".mkv", ".avi"}:
        return "video"
    if ct.startswith("image/") or ext in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"}:
        return "image"
    if ct.startswith("audio/") or ext in {".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac"}:
        return "audio"
    if ct == "application/pdf" or ext == ".pdf":
        return "pdf"
    return "file"


def is_safe_inline_mime(content_type: str, filename: str) -> bool:
    """Allow inline browser rendering only for safe non-scripting media types (blocks HTML/SVG XSS)."""
    ct = (content_type or "").lower().split(";")[0].strip()
    ext = Path(filename or "").suffix.lower()
    if ext in {".svg", ".html", ".htm", ".xml", ".xhtml", ".js", ".mjs"}:
        return False
    return ct in SAFE_INLINE_MIME_TYPES


def _is_disallowed_ip(ip_str: str) -> bool:
    ip = ipaddress.ip_address(ip_str)
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def validate_public_http_url(raw_url: str) -> str:
    """Validate that a URL is HTTP/HTTPS and does not resolve to private/internal networks (SSRF guard)."""
    url = (raw_url or "").strip()
    if not url or len(url) > 2048:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL không hợp lệ hoặc quá dài.",
        )

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập đường dẫn bắt đầu bằng http:// hoặc https://.",
        )

    hostname = parsed.hostname.lower()
    if hostname in {"localhost", "127.0.0.1", "0.0.0.0", "::1"} or hostname.endswith(".local"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không cho phép truy cập địa chỉ mạng nội bộ.",
        )

    try:
        # Check literal IP address first
        if _is_disallowed_ip(hostname):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không cho phép truy cập địa chỉ IP nội bộ.",
            )
    except ValueError:
        # Resolve DNS and verify all returned IPs are public
        try:
            addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
        except socket.gaierror as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể phân giải tên miền từ URL đã nhập.",
            ) from exc

        if not addr_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không tìm thấy địa chỉ IP công khai cho URL này.",
            )
        for item in addr_info:
            resolved_ip = item[4][0]
            if _is_disallowed_ip(resolved_ip):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tên miền trỏ tới địa chỉ nội bộ không được phép.",
                )

    return url


class InMemoryRateLimiter:
    """Lightweight sliding-window rate limiter keyed by client IP and route group."""

    def __init__(self, max_requests: int, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)

    def check(self, request: Request, bucket: str) -> None:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else (
            request.client.host if request.client else "unknown"
        )
        key = (client_ip, bucket)
        now = time.monotonic()
        queue = self._hits[key]

        while queue and (now - queue[0]) > self.window_seconds:
            queue.popleft()

        if len(queue) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Bạn thao tác quá nhanh, vui lòng thử lại sau ít giây.",
            )
        queue.append(now)
