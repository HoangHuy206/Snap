"""FastAPI entry point for VidQR backend."""

from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import MediaItem, utc_now
from app.routers import feedback, media, social
from app.services.social_dl import _detect_modern_ffmpeg
from app.storage import StorageManager

settings = get_settings()


def _cleanup_expired_items() -> int:
    """Delete expired media records and clean up stored objects."""
    db = SessionLocal()
    storage = StorageManager(settings)
    removed = 0
    try:
        now = utc_now()
        expired = db.query(MediaItem).filter(MediaItem.expires_at.isnot(None), MediaItem.expires_at <= now).all()
        for item in expired:
            storage.delete_object(item.storage_key, item.storage_backend)
            db.delete(item)
            removed += 1
        if removed:
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    return removed


async def _periodic_cleanup_loop() -> None:
    while True:
        await asyncio.sleep(3600)
        _cleanup_expired_items()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _cleanup_expired_items()
    task = asyncio.create_task(_periodic_cleanup_loop())
    try:
        yield
    finally:
        task.cancel()


app = FastAPI(
    title=f"{settings.app_name} API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Range", "Accept-Ranges"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    return response


app.include_router(media.router)
app.include_router(social.router)
app.include_router(feedback.router)


@app.get("/api/health")
def health_check():
    """Health & capability endpoint for monitoring and frontend configuration."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "storage_mode": settings.active_storage_mode,
        "max_file_size_mb": settings.max_file_size_mb,
        "default_expiry_days": settings.default_expiry_days,
        "max_expiry_days": settings.max_expiry_days,
        "ffmpeg_ready": _detect_modern_ffmpeg(settings) is not None,
        "feedback_telegram_configured": bool(settings.telegram_bot_token),
    }
