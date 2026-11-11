"""ORM database models."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import BigInteger, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utc_now() -> datetime:
    """Return timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class MediaItem(Base):
    """Represents a hosted video or file linked to a customizable Dynamic QR code."""

    __tablename__ = "media_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    media_kind: Mapped[str] = mapped_column(String(32), nullable=False)  # video | image | audio | pdf | file
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)

    storage_backend: Mapped[str] = mapped_column(String(16), nullable=False)  # local | s3
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="ready", nullable=False)  # pending | ready

    edit_token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    qr_config_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)


class AppSetting(Base):
    """Stores persistent runtime key-value settings (such as auto-discovered Telegram chat_id)."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class FeedbackMessage(Base):
    """Stores user feedback submissions alongside Telegram notification delivery status."""

    __tablename__ = "feedback_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(32), default="feature", nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    sender_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contact: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    page_url: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    telegram_delivered: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
