"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import List
import os

from dotenv import load_dotenv

load_dotenv()


def _normalize_database_url(raw_url: str) -> str:
    """Normalize PostgreSQL URLs (Render/Railway/Heroku style) for SQLAlchemy psycopg3."""
    url = (raw_url or "").strip()
    if not url:
        return "sqlite:///./data/snapqr.db"
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    """Centralized settings container."""

    def __init__(self) -> None:
        self.app_name: str = os.getenv("APP_NAME", "TiaQR")
        self.environment: str = os.getenv("ENVIRONMENT", "development")
        self.port: int = int(os.getenv("PORT", "8000"))

        raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
        self.cors_origins: List[str] = [o.strip().rstrip("/") for o in raw_origins.split(",") if o.strip()]

        self.database_url: str = _normalize_database_url(os.getenv("DATABASE_URL", "sqlite:///./data/snapqr.db"))

        self.storage_backend: str = os.getenv("STORAGE_BACKEND", "auto").strip().lower()
        self.local_storage_dir: Path = Path(os.getenv("LOCAL_STORAGE_DIR", "./data/uploads")).resolve()

        self.s3_endpoint_url: str = os.getenv("S3_ENDPOINT_URL", "").strip()
        self.s3_region: str = os.getenv("S3_REGION", "auto").strip()
        self.s3_bucket: str = os.getenv("S3_BUCKET", "").strip()
        self.s3_access_key_id: str = os.getenv("S3_ACCESS_KEY_ID", "").strip()
        self.s3_secret_access_key: str = os.getenv("S3_SECRET_ACCESS_KEY", "").strip()
        self.s3_public_base_url: str = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")
        self.use_presigned_upload: bool = _parse_bool(os.getenv("USE_PRESIGNED_UPLOAD"), False)

        self.max_file_size_mb: int = int(os.getenv("MAX_FILE_SIZE_MB", "200"))
        self.max_file_size_bytes: int = self.max_file_size_mb * 1024 * 1024
        self.default_expiry_days: int = int(os.getenv("DEFAULT_EXPIRY_DAYS", "7"))
        self.max_expiry_days: int = int(os.getenv("MAX_EXPIRY_DAYS", "30"))
        self.rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "40"))

        self.ytdlp_proxy: str = os.getenv("YTDLP_PROXY", "").strip()
        self.ytdlp_cookies_file: str = os.getenv("YTDLP_COOKIES_FILE", "").strip()
        self.ffmpeg_path: str = os.getenv("FFMPEG_PATH", "").strip()

        self.telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        self.telegram_chat_id: str = os.getenv("TELEGRAM_CHAT_ID", "").strip()

    @property
    def is_s3_configured(self) -> bool:
        return bool(self.s3_bucket and self.s3_access_key_id and self.s3_secret_access_key)

    @property
    def active_storage_mode(self) -> str:
        if self.storage_backend == "s3":
            if not self.is_s3_configured:
                raise RuntimeError("STORAGE_BACKEND=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.")
            return "s3"
        if self.storage_backend == "local":
            return "local"
        return "s3" if self.is_s3_configured else "local"


@lru_cache
def get_settings() -> Settings:
    return Settings()
