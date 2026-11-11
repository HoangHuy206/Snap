"""Storage abstraction supporting Cloudflare R2 / AWS S3 and local filesystem with Range streaming."""

from pathlib import Path
from typing import BinaryIO, Iterator, Optional
from urllib.parse import quote
import shutil

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, Request, UploadFile, status
from fastapi.responses import RedirectResponse, StreamingResponse

from app.config import Settings, get_settings
from app.security import is_safe_inline_mime

CHUNK_SIZE = 1024 * 1024  # 1 MiB


class StorageManager:
    """Manages file persistence and retrieval across S3/R2 and local disk."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._s3_client = None
        if settings.active_storage_mode == "s3":
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url or None,
                region_name=settings.s3_region or "auto",
                aws_access_key_id=settings.s3_access_key_id,
                aws_secret_access_key=settings.s3_secret_access_key,
                config=Config(signature_version="s3v4"),
            )
        else:
            settings.local_storage_dir.mkdir(parents=True, exist_ok=True)

    @property
    def mode(self) -> str:
        return self.settings.active_storage_mode

    def _safe_local_path(self, storage_key: str) -> Path:
        base = self.settings.local_storage_dir.resolve()
        candidate = (base / storage_key).resolve()
        if candidate != base and base not in candidate.parents:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid storage key.")
        return candidate

    async def save_upload_file(self, storage_key: str, upload: UploadFile, content_type: str) -> int:
        """Stream an UploadFile to active storage while enforcing max_file_size_bytes."""
        max_bytes = self.settings.max_file_size_bytes
        total_bytes = 0

        if self.mode == "local":
            target = self._safe_local_path(storage_key)
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                with target.open("wb") as out:
                    while chunk := await upload.read(CHUNK_SIZE):
                        total_bytes += len(chunk)
                        if total_bytes > max_bytes:
                            raise HTTPException(
                                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                detail=f"Dung lượng file vượt quá giới hạn {self.settings.max_file_size_mb} MB.",
                            )
                        out.write(chunk)
            except Exception:
                target.unlink(missing_ok=True)
                raise
            return total_bytes

        # S3 / R2: spool to a bounded temp file then upload multipart cleanly via boto3
        temp_dir = self.settings.local_storage_dir / "_tmp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file = temp_dir / storage_key.replace("/", "_")
        try:
            with temp_file.open("wb") as out:
                while chunk := await upload.read(CHUNK_SIZE):
                    total_bytes += len(chunk)
                    if total_bytes > max_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"Dung lượng file vượt quá giới hạn {self.settings.max_file_size_mb} MB.",
                        )
                    out.write(chunk)

            with temp_file.open("rb") as fh:
                self._s3_client.upload_fileobj(
                    fh,
                    self.settings.s3_bucket,
                    storage_key,
                    ExtraArgs={"ContentType": content_type},
                )
        finally:
            temp_file.unlink(missing_ok=True)

        return total_bytes

    def save_local_path(self, storage_key: str, source_path: Path, content_type: str) -> int:
        """Persist an already-downloaded file on disk into the active storage backend."""
        file_size = source_path.stat().st_size
        if file_size > self.settings.max_file_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Dung lượng file vượt quá giới hạn {self.settings.max_file_size_mb} MB.",
            )

        if self.mode == "local":
            target = self._safe_local_path(storage_key)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_path, target)
            return file_size

        with source_path.open("rb") as fh:
            self._s3_client.upload_fileobj(
                fh,
                self.settings.s3_bucket,
                storage_key,
                ExtraArgs={"ContentType": content_type},
            )
        return file_size

    def create_presigned_put_url(self, storage_key: str, content_type: str, expires_in: int = 900) -> str:
        """Generate a presigned PUT URL for direct browser-to-R2/S3 uploads."""
        if self.mode != "s3":
            raise RuntimeError("Presigned PUT URL is only available when S3/R2 storage is active.")
        return self._s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.settings.s3_bucket,
                "Key": storage_key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )

    def head_s3_object(self, storage_key: str) -> Optional[int]:
        """Verify an uploaded S3/R2 object exists and return its byte size."""
        if self.mode != "s3":
            return None
        try:
            resp = self._s3_client.head_object(Bucket=self.settings.s3_bucket, Key=storage_key)
            return int(resp["ContentLength"])
        except ClientError:
            return None

    def delete_object(self, storage_key: str, backend: str) -> None:
        """Delete a stored object from the specified backend."""
        if not storage_key:
            return
        if backend == "local":
            try:
                path = self._safe_local_path(storage_key)
                path.unlink(missing_ok=True)
            except HTTPException:
                return
        elif backend == "s3" and self._s3_client is not None:
            try:
                self._s3_client.delete_object(Bucket=self.settings.s3_bucket, Key=storage_key)
            except ClientError:
                pass

    def build_content_disposition(self, filename: str, content_type: str, force_download: bool) -> str:
        """Build safe Content-Disposition header blocking inline execution of active document types."""
        inline_allowed = (not force_download) and is_safe_inline_mime(content_type, filename)
        disposition_type = "inline" if inline_allowed else "attachment"
        ascii_fallback = filename.encode("ascii", "ignore").decode("ascii") or "file"
        encoded = quote(filename)
        return f"{disposition_type}; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded}"

    def serve_file(
        self,
        request: Request,
        storage_key: str,
        backend: str,
        filename: str,
        content_type: str,
        force_download: bool,
    ):
        """Return a RedirectResponse (S3/R2 presigned or CDN) or Range-capable StreamingResponse (local)."""
        disposition = self.build_content_disposition(filename, content_type, force_download)

        if backend == "s3":
            if self._s3_client is None:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="S3/R2 storage chưa được cấu hình trên máy chủ.",
                )
            if self.settings.s3_public_base_url and not force_download and is_safe_inline_mime(content_type, filename):
                return RedirectResponse(url=f"{self.settings.s3_public_base_url}/{storage_key}", status_code=302)

            presigned_get = self._s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.settings.s3_bucket,
                    "Key": storage_key,
                    "ResponseContentDisposition": disposition,
                    "ResponseContentType": content_type if is_safe_inline_mime(content_type, filename) else "application/octet-stream",
                },
                ExpiresIn=3600,
            )
            return RedirectResponse(url=presigned_get, status_code=302)

        file_path = self._safe_local_path(storage_key)
        if not file_path.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tệp tin trên máy chủ.")

        file_size = file_path.stat().st_size
        safe_media_type = content_type if is_safe_inline_mime(content_type, filename) else "application/octet-stream"
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Disposition": disposition,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=300",
        }
        if not is_safe_inline_mime(content_type, filename):
            headers["Content-Security-Policy"] = "sandbox"

        range_header = request.headers.get("range")
        if not range_header:
            headers["Content-Length"] = str(file_size)
            return StreamingResponse(
                _iter_file_range(file_path, 0, file_size - 1),
                status_code=200,
                media_type=safe_media_type,
                headers=headers,
            )

        start, end = _parse_range_header(range_header, file_size)
        content_length = (end - start) + 1
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        headers["Content-Length"] = str(content_length)
        return StreamingResponse(
            _iter_file_range(file_path, start, end),
            status_code=206,
            media_type=safe_media_type,
            headers=headers,
        )


def _parse_range_header(range_header: str, file_size: int) -> tuple[int, int]:
    if file_size <= 0:
        return 0, 0
    if not range_header.startswith("bytes="):
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Invalid Range header")

    spec = range_header[6:].split(",")[0].strip()
    if "-" not in spec:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Invalid Range syntax")

    start_str, end_str = spec.split("-", 1)
    try:
        if not start_str and end_str:
            suffix = int(end_str)
            start = max(0, file_size - suffix)
            end = file_size - 1
        else:
            start = int(start_str)
            end = int(end_str) if end_str else file_size - 1
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Invalid Range numbers") from exc

    if start < 0 or end >= file_size or start > end:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            headers={"Content-Range": f"bytes */{file_size}"},
            detail="Requested range not satisfiable",
        )
    return start, end


def _iter_file_range(path: Path, start: int, end: int) -> Iterator[bytes]:
    remaining = max(0, (end - start) + 1)
    with path.open("rb") as fh:  # type: BinaryIO
        fh.seek(start)
        while remaining > 0:
            read_size = min(CHUNK_SIZE, remaining)
            data = fh.read(read_size)
            if not data:
                break
            remaining -= len(data)
            yield data


def get_storage() -> StorageManager:
    return StorageManager(get_settings())
