"""Social media extraction & watermark-free downloading powered by yt-dlp + ffmpeg."""

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional
import os
import re
import shutil
import subprocess
import tempfile
import uuid

from fastapi import HTTPException, status
import yt_dlp

from app.config import Settings
from app.security import sanitize_filename, validate_public_http_url


@dataclass
class SocialFormatOption:
    id: str
    label: str
    kind: str  # video | audio | image
    ext: str
    resolution: Optional[str]
    filesize_approx: Optional[int]
    watermark_free: bool
    recommended: bool = False


def _detect_modern_ffmpeg(settings: Settings) -> Optional[str]:
    """Return path to ffmpeg if available and recent enough (>= v4) for modern muxing."""
    candidate = settings.ffmpeg_path or shutil.which("ffmpeg")
    if not candidate:
        return None
    try:
        proc = subprocess.run(
            [candidate, "-version"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
        first_line = (proc.stdout or "").splitlines()[0] if proc.stdout else ""
        # Reject ancient 2013/pre-4.x builds when choosing muxing strategy
        year_match = re.search(r"built on .*?(20\d{2})", proc.stdout or "")
        if year_match and int(year_match.group(1)) < 2018:
            return None
        ver_match = re.search(r"ffmpeg version (?:n)?(\d+)\.", first_line)
        if ver_match and int(ver_match.group(1)) < 4:
            return None
        return candidate
    except Exception:
        return None


def _base_ydl_opts(settings: Settings) -> Dict[str, Any]:
    opts: Dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 20,
        "retries": 2,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            )
        },
    }
    if settings.ytdlp_proxy:
        opts["proxy"] = settings.ytdlp_proxy
    if settings.ytdlp_cookies_file and Path(settings.ytdlp_cookies_file).is_file():
        opts["cookiefile"] = settings.ytdlp_cookies_file
    ffmpeg_bin = _detect_modern_ffmpeg(settings)
    if ffmpeg_bin:
        opts["ffmpeg_location"] = str(Path(ffmpeg_bin).parent)
    return opts


def _is_watermarked_format(fmt: Dict[str, Any], extractor_key: str) -> bool:
    fid = str(fmt.get("format_id") or "").lower()
    note = str(fmt.get("format_note") or "").lower()
    url = str(fmt.get("url") or "").lower()

    if "watermark" in note and "no" not in note and "without" not in note:
        return True
    if "tiktok" in extractor_key.lower():
        if fid.startswith("download") or "watermark" in fid or "wm" in fid.split("-"):
            return True
        if "watermark=1" in url:
            return True
    return False


def _pick_thumbnail(info: Dict[str, Any]) -> Optional[str]:
    if info.get("thumbnail"):
        return str(info["thumbnail"])
    thumbs = info.get("thumbnails") or []
    if thumbs:
        return str(thumbs[-1].get("url") or "") or None
    return None


def _curate_formats(info: Dict[str, Any], has_modern_ffmpeg: bool) -> List[Dict[str, Any]]:
    extractor = str(info.get("extractor_key") or info.get("extractor") or "Social")
    raw_formats = info.get("formats") or []
    curated: List[SocialFormatOption] = []
    seen_heights = set()

    # Check if this entry is an image-only post
    ext_top = str(info.get("ext") or "").lower()
    if ext_top in {"jpg", "jpeg", "png", "webp"} and not raw_formats:
        curated.append(
            SocialFormatOption(
                id="best",
                label=f"Ảnh gốc ({ext_top.upper()}) • Không logo",
                kind="image",
                ext=ext_top,
                resolution="Original",
                filesize_approx=info.get("filesize") or info.get("filesize_approx"),
                watermark_free=True,
                recommended=True,
            )
        )
        return [vars(item) for item in curated]

    # 1. Separate progressive MP4 (video+audio in one file, never needs ffmpeg) vs adaptive video-only
    progressive_clean: List[Dict[str, Any]] = []
    video_only_clean: List[Dict[str, Any]] = []
    audio_formats: List[Dict[str, Any]] = []

    for fmt in raw_formats:
        vcodec = fmt.get("vcodec") or "none"
        acodec = fmt.get("acodec") or "none"
        ext = (fmt.get("ext") or "").lower()
        watermarked = _is_watermarked_format(fmt, extractor)

        if vcodec != "none" and acodec != "none":
            if not watermarked:
                progressive_clean.append(fmt)
        elif vcodec != "none" and acodec == "none":
            if not watermarked and ext in {"mp4", "webm", "mov"}:
                video_only_clean.append(fmt)
        elif vcodec == "none" and acodec != "none":
            audio_formats.append(fmt)

    # Sort descending by height/tbr
    progressive_clean.sort(key=lambda f: (f.get("height") or 0, f.get("tbr") or 0), reverse=True)
    video_only_clean.sort(key=lambda f: (f.get("height") or 0, f.get("tbr") or 0), reverse=True)
    audio_formats.sort(key=lambda f: (f.get("abr") or f.get("tbr") or 0), reverse=True)

    # Recommend best clean video option
    if has_modern_ffmpeg and video_only_clean:
        for fmt in video_only_clean:
            height = int(fmt.get("height") or 0)
            if height in seen_heights or height <= 0:
                continue
            if height > 2160:
                continue
            seen_heights.add(height)
            selector = f"{fmt['format_id']}+bestaudio[ext=m4a]/best[ext=mp4]/best"
            curated.append(
                SocialFormatOption(
                    id=selector,
                    label=f"Video {height}p (MP4) • Không logo",
                    kind="video",
                    ext="mp4",
                    resolution=f"{height}p",
                    filesize_approx=fmt.get("filesize") or fmt.get("filesize_approx"),
                    watermark_free=True,
                    recommended=len(curated) == 0,
                )
            )
            if len(curated) >= 3:
                break

    for fmt in progressive_clean:
        height = int(fmt.get("height") or 0)
        label_res = f"{height}p" if height > 0 else "HD"
        if height > 0 and height in seen_heights:
            continue
        if height > 0:
            seen_heights.add(height)
        curated.append(
            SocialFormatOption(
                id=str(fmt["format_id"]),
                label=f"Video {label_res} (MP4) • Không logo",
                kind="video",
                ext="mp4",
                resolution=label_res,
                filesize_approx=fmt.get("filesize") or fmt.get("filesize_approx"),
                watermark_free=True,
                recommended=len(curated) == 0,
            )
        )
        if len(curated) >= 4:
            break

    # Fallback generic selector when platform omits format heights
    if not curated:
        fallback_sel = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" if has_modern_ffmpeg else "best[ext=mp4]/best"
        curated.append(
            SocialFormatOption(
                id=fallback_sel,
                label="Video chất lượng tốt nhất • Không logo",
                kind="video",
                ext="mp4",
                resolution="Auto",
                filesize_approx=info.get("filesize") or info.get("filesize_approx"),
                watermark_free=True,
                recommended=True,
            )
        )

    if audio_formats:
        best_audio = audio_formats[0]
        audio_ext = "mp3" if has_modern_ffmpeg else (best_audio.get("ext") or "m4a")
        curated.append(
            SocialFormatOption(
                id=f"audio:{best_audio['format_id']}",
                label=f"Chỉ Âm thanh ({audio_ext.upper()})",
                kind="audio",
                ext=audio_ext,
                resolution="Audio",
                filesize_approx=best_audio.get("filesize") or best_audio.get("filesize_approx"),
                watermark_free=True,
                recommended=False,
            )
        )

    return [vars(item) for item in curated]


def inspect_social_url(raw_url: str, settings: Settings) -> Dict[str, Any]:
    """Inspect a social media URL and return metadata, clean download formats, and image items."""
    safe_url = validate_public_http_url(raw_url)
    has_modern_ffmpeg = _detect_modern_ffmpeg(settings) is not None
    opts = _base_ydl_opts(settings)

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(safe_url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Không thể phân tích đường dẫn này: {str(exc).splitlines()[-1][:220]}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Lỗi khi kết nối tới nền tảng: {str(exc)[:180]}",
        ) from exc

    if not info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nội dung từ URL này.")

    # Handle multi-item posts (carousels / slideshows)
    raw_entries = info.get("entries")
    gallery_items: List[Dict[str, Any]] = []
    primary_info = info
    if raw_entries is not None and not isinstance(raw_entries, (str, bytes, dict)):
        entries_list = list(raw_entries)[:20]
        valid_entries = [e for e in entries_list if isinstance(e, dict)]
        if valid_entries:
            primary_info = valid_entries[0]
            for idx, entry in enumerate(valid_entries[:20], start=1):
                entry_ext = str(entry.get("ext") or "").lower()
                is_img = entry_ext in {"jpg", "jpeg", "png", "webp"} and not entry.get("duration")
                media_url = entry.get("url") or _pick_thumbnail(entry)
                if media_url:
                    gallery_items.append(
                        {
                            "index": idx,
                            "kind": "image" if is_img else "video",
                            "ext": entry_ext or ("jpg" if is_img else "mp4"),
                            "url": media_url,
                            "thumbnail": _pick_thumbnail(entry) or media_url,
                            "title": entry.get("title") or f"Item {idx}",
                        }
                    )

    platform = str(primary_info.get("extractor_key") or info.get("extractor_key") or "Web")
    formats = _curate_formats(primary_info, has_modern_ffmpeg)
    thumbnail = _pick_thumbnail(primary_info) or _pick_thumbnail(info)

    return {
        "source_url": safe_url,
        "platform": platform,
        "title": primary_info.get("title") or info.get("title") or "Social Media Video",
        "uploader": primary_info.get("uploader") or primary_info.get("channel") or info.get("uploader"),
        "duration": primary_info.get("duration"),
        "thumbnail": thumbnail,
        "ffmpeg_ready": has_modern_ffmpeg,
        "formats": formats,
        "gallery_items": gallery_items,
    }


def download_social_media_to_temp(
    raw_url: str,
    format_selector: str,
    settings: Settings,
) -> tuple[Path, str, str]:
    """Download selected clean format to a temporary directory and return (file_path, filename, content_type)."""
    safe_url = validate_public_http_url(raw_url)
    has_modern_ffmpeg = _detect_modern_ffmpeg(settings) is not None
    temp_dir = Path(tempfile.mkdtemp(prefix="snapqr_dl_"))
    output_tmpl = str(temp_dir / f"media_{uuid.uuid4().hex[:8]}.%(ext)s")

    opts = _base_ydl_opts(settings)
    opts["outtmpl"] = output_tmpl
    opts["max_filesize"] = settings.max_file_size_bytes

    is_audio = format_selector.startswith("audio:")
    if is_audio:
        raw_fid = format_selector.split(":", 1)[1] or "bestaudio"
        opts["format"] = f"{raw_fid}/bestaudio/best"
        if has_modern_ffmpeg:
            opts["postprocessors"] = [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ]
    else:
        if format_selector and format_selector != "auto":
            # Strip strict merged syntax if local ffmpeg is unavailable/outdated
            if "+" in format_selector and not has_modern_ffmpeg:
                opts["format"] = "best[ext=mp4]/best"
            else:
                opts["format"] = format_selector
        else:
            opts["format"] = (
                "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
                if has_modern_ffmpeg
                else "best[ext=mp4]/best"
            )
        if has_modern_ffmpeg:
            opts["merge_output_format"] = "mp4"

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(safe_url, download=True)
    except Exception as exc:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Không thể tải media từ liên kết này: {str(exc).splitlines()[-1][:220]}",
        ) from exc

    files = [p for p in temp_dir.iterdir() if p.is_file()]
    if not files:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nền tảng không trả về file tải xuống hợp lệ hoặc file vượt quá giới hạn dung lượng.",
        )

    downloaded_file = max(files, key=lambda p: p.stat().st_size)
    ext = downloaded_file.suffix.lstrip(".").lower() or "mp4"
    raw_title = (info.get("title") if isinstance(info, dict) else None) or "vidqr_media"
    clean_name = sanitize_filename(f"{raw_title[:80]}.{ext}")

    content_type_map = {
        "mp4": "video/mp4",
        "webm": "video/webm",
        "mov": "video/quicktime",
        "mp3": "audio/mpeg",
        "m4a": "audio/mp4",
        "ogg": "audio/ogg",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
    }
    content_type = content_type_map.get(ext, "application/octet-stream")
    return downloaded_file, clean_name, content_type
