"""Social media inspection, watermark-free downloading, image proxy, and one-click Save-to-QR."""

from datetime import timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import quote
import json
import shutil

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import httpx

from app.config import Settings, get_settings
from app.database import get_db
from app.models import MediaItem, utc_now
from app.security import (
    InMemoryRateLimiter,
    classify_media_kind,
    generate_edit_token,
    generate_short_code,
    hash_token,
    sanitize_filename,
    validate_public_http_url,
)
from app.services.social_dl import download_social_media_to_temp, inspect_social_url
from app.storage import StorageManager, get_storage

router = APIRouter(prefix="/api/social", tags=["Social Media Downloader"])
social_limiter = InMemoryRateLimiter(max_requests=25, window_seconds=60)


class InspectRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=2048)


class DownloadRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=2048)
    format_id: str = Field(default="auto", max_length=120)


class SaveToQrRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=2048)
    format_id: str = Field(default="auto", max_length=120)
    title: Optional[str] = Field(default=None, max_length=200)
    expiry_days: Optional[int] = Field(default=None, ge=1, le=365)


def _cleanup_temp_dir(file_path: Path) -> None:
    shutil.rmtree(file_path.parent, ignore_errors=True)


@router.post("/inspect")
async def inspect_url(
    payload: InspectRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
):
    """Inspect a TikTok/YouTube/IG/FB link and return clean format choices."""
    social_limiter.check(request, "social_inspect")
    return await run_in_threadpool(inspect_social_url, payload.url, settings)


@router.post("/download")
async def download_social_media(
    payload: DownloadRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
):
    """Download clean watermark-free video/audio/image and stream it to the client."""
    social_limiter.check(request, "social_download")
    file_path, clean_name, content_type = await run_in_threadpool(
        download_social_media_to_temp,
        payload.url,
        payload.format_id,
        settings,
    )
    background_tasks.add_task(_cleanup_temp_dir, file_path)
    ascii_fallback = clean_name.encode("ascii", "ignore").decode("ascii") or "download"
    encoded = quote(clean_name)

    return FileResponse(
        path=file_path,
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded}",
            "X-Content-Type-Options": "nosniff",
        },
        background=background_tasks,
    )


@router.post("/save-to-qr")
async def save_social_media_to_qr(
    payload: SaveToQrRequest,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage: StorageManager = Depends(get_storage),
):
    """Download watermark-free social media directly to storage and mint a customizable Dynamic QR."""
    social_limiter.check(request, "social_download")
    file_path, clean_name, content_type = await run_in_threadpool(
        download_social_media_to_temp,
        payload.url,
        payload.format_id,
        settings,
    )
    try:
        code = generate_short_code(8)
        while db.query(MediaItem.id).filter(MediaItem.code == code).first():
            code = generate_short_code(8)

        edit_token = generate_edit_token()
        storage_key = f"media/{code}/{clean_name}"
        file_size = storage.save_local_path(storage_key, file_path, content_type)
        days = max(1, min(payload.expiry_days or settings.default_expiry_days, settings.max_expiry_days))

        item = MediaItem(
            code=code,
            title=(payload.title or clean_name.rsplit(".", 1)[0])[:200],
            description=f"Lưu từ liên kết mạng xã hội",
            original_filename=clean_name,
            content_type=content_type,
            media_kind=classify_media_kind(content_type, clean_name),
            file_size=file_size,
            storage_backend=storage.mode,
            storage_key=storage_key,
            status="ready",
            edit_token_hash=hash_token(edit_token),
            expires_at=utc_now() + timedelta(days=days),
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        return {
            "code": item.code,
            "title": item.title,
            "original_filename": item.original_filename,
            "content_type": item.content_type,
            "media_kind": item.media_kind,
            "file_size": item.file_size,
            "edit_token": edit_token,
            "expires_at": item.expires_at.isoformat() if item.expires_at else None,
        }
    finally:
        _cleanup_temp_dir(file_path)


@router.get("/proxy-image")
async def proxy_image(
    url: str = Query(..., min_length=8, max_length=2048),
    download: bool = Query(default=False),
    filename: Optional[str] = Query(default=None),
):
    """Safely proxy remote thumbnails or gallery images (SSRF-checked, image/* only)."""
    safe_url = validate_public_http_url(url)

    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        try:
            resp = await client.get(
                safe_url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                    )
                },
            )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Không tải được ảnh xem trước.") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Ảnh từ nền tảng không còn khả dụng.")

    ct = (resp.headers.get("content-type") or "").split(";")[0].strip().lower()
    if not ct.startswith("image/") or ct == "image/svg+xml":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tài nguyên không phải định dạng ảnh hợp lệ.")

    if len(resp.content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Ảnh vượt quá 15MB.")

    headers = {
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=1800",
    }
    if download:
        ext = ct.split("/")[-1].replace("jpeg", "jpg")
        clean_name = sanitize_filename(filename or f"vidqr_image.{ext}")
        headers["Content-Disposition"] = f"attachment; filename=\"{clean_name}\""

    return Response(content=resp.content, media_type=ct, headers=headers)
