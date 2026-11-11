"""Media hosting & Dynamic QR management endpoints."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import json
import mimetypes

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

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
    verify_token,
)
from app.storage import StorageManager, get_storage

router = APIRouter(prefix="/api/media", tags=["Media & QR"])
upload_limiter = InMemoryRateLimiter(max_requests=30, window_seconds=60)


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _clamp_expiry_days(expiry_days: Optional[int], settings: Settings) -> Optional[datetime]:
    if expiry_days is None:
        days = settings.default_expiry_days
    else:
        days = max(1, min(expiry_days, settings.max_expiry_days))
    if days <= 0:
        return None
    return utc_now() + timedelta(days=days)


def _serialize_item(item: MediaItem) -> Dict[str, Any]:
    qr_config = None
    if item.qr_config_json:
        try:
            qr_config = json.loads(item.qr_config_json)
        except json.JSONDecodeError:
            qr_config = None
    return {
        "code": item.code,
        "title": item.title,
        "description": item.description,
        "original_filename": item.original_filename,
        "content_type": item.content_type,
        "media_kind": item.media_kind,
        "file_size": item.file_size,
        "storage_backend": item.storage_backend,
        "view_count": item.view_count,
        "download_count": item.download_count,
        "qr_config": qr_config,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
        "expires_at": item.expires_at.isoformat() if item.expires_at else None,
    }


def _get_active_item_or_404(code: str, db: Session, storage: StorageManager) -> MediaItem:
    item = db.query(MediaItem).filter(MediaItem.code == code, MediaItem.status == "ready").first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy mã QR hoặc file đã bị xóa.")
    expires_at = _ensure_utc(item.expires_at)
    if expires_at and expires_at <= utc_now():
        storage.delete_object(item.storage_key, item.storage_backend)
        db.delete(item)
        db.commit()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Liên kết và tệp tin của mã QR này đã hết hạn.")
    return item


def _require_edit_auth(item: MediaItem, edit_token: Optional[str]) -> None:
    if not edit_token or not verify_token(edit_token, item.edit_token_hash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token quản lý không hợp lệ.")


def _unique_code(db: Session) -> str:
    for _ in range(10):
        candidate = generate_short_code(8)
        exists = db.query(MediaItem.id).filter(MediaItem.code == candidate).first()
        if not exists:
            return candidate
    raise HTTPException(status_code=500, detail="Không thể khởi tạo mã QR duy nhất.")


class InitUploadRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(default="application/octet-stream", max_length=150)
    file_size: int = Field(..., gt=0)
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    expiry_days: Optional[int] = Field(default=None, ge=1, le=365)
    qr_config: Optional[Dict[str, Any]] = None


class CompleteUploadRequest(BaseModel):
    code: str = Field(..., min_length=4, max_length=16)


class UpdateMediaRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    qr_config: Optional[Dict[str, Any]] = None
    extend_days: Optional[int] = Field(default=None, ge=1, le=365)


@router.post("/init")
def init_upload(
    payload: InitUploadRequest,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage: StorageManager = Depends(get_storage),
):
    """Initialize an upload (presigned S3/R2 PUT when enabled, else indicates multipart backend upload)."""
    upload_limiter.check(request, "media_upload")
    if payload.file_size > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dung lượng file vượt quá giới hạn {settings.max_file_size_mb} MB.",
        )

    if not (settings.use_presigned_upload and storage.mode == "s3"):
        return {
            "upload_mode": "backend_multipart",
            "max_file_size_bytes": settings.max_file_size_bytes,
        }

    safe_name = sanitize_filename(payload.filename)
    code = _unique_code(db)
    edit_token = generate_edit_token()
    storage_key = f"media/{code}/{safe_name}"
    ct = payload.content_type or mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
    title = (payload.title or Path_stem(safe_name))[:200]

    item = MediaItem(
        code=code,
        title=title,
        description=payload.description,
        original_filename=safe_name,
        content_type=ct,
        media_kind=classify_media_kind(ct, safe_name),
        file_size=payload.file_size,
        storage_backend="s3",
        storage_key=storage_key,
        status="pending",
        edit_token_hash=hash_token(edit_token),
        qr_config_json=json.dumps(payload.qr_config) if payload.qr_config else None,
        expires_at=_clamp_expiry_days(payload.expiry_days, settings),
    )
    db.add(item)
    db.commit()

    put_url = storage.create_presigned_put_url(storage_key, ct)
    return {
        "upload_mode": "presigned_put",
        "code": code,
        "edit_token": edit_token,
        "put_url": put_url,
        "content_type": ct,
    }


def Path_stem(filename: str) -> str:
    if "." in filename:
        return filename.rsplit(".", 1)[0] or filename
    return filename


@router.post("/complete")
def complete_presigned_upload(
    payload: CompleteUploadRequest,
    x_edit_token: Optional[str] = Header(default=None, alias="X-Edit-Token"),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage: StorageManager = Depends(get_storage),
):
    """Finalize a presigned S3/R2 upload after verifying the object exists and fits size policy."""
    item = db.query(MediaItem).filter(MediaItem.code == payload.code).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên upload.")
    _require_edit_auth(item, x_edit_token)

    actual_size = storage.head_s3_object(item.storage_key)
    if actual_size is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File chưa được tải lên Storage.")
    if actual_size > settings.max_file_size_bytes:
        storage.delete_object(item.storage_key, item.storage_backend)
        db.delete(item)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File vượt quá giới hạn {settings.max_file_size_mb} MB.",
        )

    item.file_size = actual_size
    item.status = "ready"
    db.commit()
    db.refresh(item)
    return _serialize_item(item)


@router.post("/upload")
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    description: Optional[str] = Form(default=None),
    expiry_days: Optional[int] = Form(default=None),
    qr_config_json: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage: StorageManager = Depends(get_storage),
):
    """Upload a video or any file directly to R2/S3 or local storage and return a Dynamic QR record."""
    upload_limiter.check(request, "media_upload")

    safe_name = sanitize_filename(file.filename or "upload.bin")
    guessed_ct = mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
    content_type = (file.content_type or guessed_ct).split(";")[0].strip()
    if content_type == "application/octet-stream" and guessed_ct != "application/octet-stream":
        content_type = guessed_ct

    parsed_qr_config = None
    if qr_config_json:
        try:
            loaded = json.loads(qr_config_json)
            if isinstance(loaded, dict):
                parsed_qr_config = json.dumps(loaded)
        except json.JSONDecodeError:
            parsed_qr_config = None

    code = _unique_code(db)
    edit_token = generate_edit_token()
    storage_key = f"media/{code}/{safe_name}"

    written_size = await storage.save_upload_file(storage_key, file, content_type)
    if written_size <= 0:
        storage.delete_object(storage_key, storage.mode)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tệp tin rỗng không hợp lệ.")

    clean_title = (title or "").strip()[:200] or Path_stem(safe_name)[:200]
    clean_desc = (description or "").strip()[:1000] or None

    item = MediaItem(
        code=code,
        title=clean_title,
        description=clean_desc,
        original_filename=safe_name,
        content_type=content_type,
        media_kind=classify_media_kind(content_type, safe_name),
        file_size=written_size,
        storage_backend=storage.mode,
        storage_key=storage_key,
        status="ready",
        edit_token_hash=hash_token(edit_token),
        qr_config_json=parsed_qr_config,
        expires_at=_clamp_expiry_days(expiry_days, settings),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    result = _serialize_item(item)
    result["edit_token"] = edit_token
    return result


@router.get("/{code}")
def get_media_metadata(
    code: str,
    track_view: bool = Query(default=False),
    db: Session = Depends(get_db),
    storage: StorageManager = Depends(get_storage),
):
    """Fetch public metadata for a hosted media/file QR landing page."""
    item = _get_active_item_or_404(code, db, storage)
    if track_view:
        item.view_count += 1
        db.commit()
        db.refresh(item)
    return _serialize_item(item)


@router.get("/{code}/file")
def stream_or_download_media(
    code: str,
    request: Request,
    download: bool = Query(default=False),
    db: Session = Depends(get_db),
    storage: StorageManager = Depends(get_storage),
):
    """Stream media (with Range requests for mobile video playback) or download attachment."""
    item = _get_active_item_or_404(code, db, storage)
    if download:
        item.download_count += 1
        db.commit()

    return storage.serve_file(
        request=request,
        storage_key=item.storage_key,
        backend=item.storage_backend,
        filename=item.original_filename,
        content_type=item.content_type,
        force_download=download,
    )


@router.post("/{code}/verify-token")
def verify_manage_token(
    code: str,
    x_edit_token: Optional[str] = Header(default=None, alias="X-Edit-Token"),
    db: Session = Depends(get_db),
    storage: StorageManager = Depends(get_storage),
):
    """Validate an edit token for the Dynamic QR management page."""
    item = _get_active_item_or_404(code, db, storage)
    _require_edit_auth(item, x_edit_token)
    return {"valid": True, "item": _serialize_item(item)}


@router.patch("/{code}")
def update_media_metadata(
    code: str,
    payload: UpdateMediaRequest,
    x_edit_token: Optional[str] = Header(default=None, alias="X-Edit-Token"),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage: StorageManager = Depends(get_storage),
):
    """Update title, description, QR design config, or expiry for a Dynamic QR item."""
    item = _get_active_item_or_404(code, db, storage)
    _require_edit_auth(item, x_edit_token)

    if payload.title is not None:
        item.title = payload.title.strip()[:200]
    if payload.description is not None:
        item.description = payload.description.strip()[:1000] or None
    if payload.qr_config is not None:
        item.qr_config_json = json.dumps(payload.qr_config)
    if payload.extend_days is not None:
        item.expires_at = _clamp_expiry_days(payload.extend_days, settings)

    item.updated_at = utc_now()
    db.commit()
    db.refresh(item)
    return _serialize_item(item)


@router.put("/{code}/file")
async def replace_media_file(
    code: str,
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    x_edit_token: Optional[str] = Header(default=None, alias="X-Edit-Token"),
    db: Session = Depends(get_db),
    storage: StorageManager = Depends(get_storage),
):
    """Dynamic QR: replace the underlying video/file while preserving the same QR code & URL."""
    upload_limiter.check(request, "media_upload")
    item = _get_active_item_or_404(code, db, storage)
    _require_edit_auth(item, x_edit_token)

    safe_name = sanitize_filename(file.filename or "upload.bin")
    guessed_ct = mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
    content_type = (file.content_type or guessed_ct).split(";")[0].strip()
    if content_type == "application/octet-stream" and guessed_ct != "application/octet-stream":
        content_type = guessed_ct

    old_key = item.storage_key
    old_backend = item.storage_backend
    new_key = f"media/{code}/{generate_short_code(4)}_{safe_name}"

    written_size = await storage.save_upload_file(new_key, file, content_type)
    if written_size <= 0:
        storage.delete_object(new_key, storage.mode)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tệp tin thay thế không hợp lệ.")

    item.original_filename = safe_name
    item.content_type = content_type
    item.media_kind = classify_media_kind(content_type, safe_name)
    item.file_size = written_size
    item.storage_backend = storage.mode
    item.storage_key = new_key
    if title and title.strip():
        item.title = title.strip()[:200]
    item.updated_at = utc_now()

    db.commit()
    db.refresh(item)

    if old_key != new_key:
        storage.delete_object(old_key, old_backend)

    return _serialize_item(item)


@router.delete("/{code}")
def delete_media_item(
    code: str,
    x_edit_token: Optional[str] = Header(default=None, alias="X-Edit-Token"),
    db: Session = Depends(get_db),
    storage: StorageManager = Depends(get_storage),
):
    """Delete a media item and its stored file permanently."""
    item = _get_active_item_or_404(code, db, storage)
    _require_edit_auth(item, x_edit_token)

    storage.delete_object(item.storage_key, item.storage_backend)
    db.delete(item)
    db.commit()
    return {"deleted": True, "code": code}
