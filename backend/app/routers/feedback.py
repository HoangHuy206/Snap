"""Feedback submission endpoint with PostgreSQL/SQLite persistence and Telegram Bot delivery."""

import html
import logging
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
import httpx

from app.config import Settings, get_settings
from app.database import get_db
from app.models import AppSetting, FeedbackMessage
from app.security import InMemoryRateLimiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])
feedback_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=300)

TELEGRAM_CHAT_ID_KEY = "telegram_chat_id"
CATEGORY_LABELS = {
    "feature": "Đề xuất tính năng",
    "bug": "Báo lỗi",
    "ui": "Giao diện & Khung QR",
    "other": "Góp ý khác",
}


class FeedbackSubmitRequest(BaseModel):
    category: Literal["feature", "bug", "ui", "other"] = "feature"
    message: str = Field(..., min_length=5, max_length=1500)
    sender_name: Optional[str] = Field(default=None, max_length=80)
    contact: Optional[str] = Field(default=None, max_length=120)
    page_url: Optional[str] = Field(default=None, max_length=300)
    website: Optional[str] = Field(default=None, max_length=120)

    @field_validator("message")
    @classmethod
    def validate_non_blank_message(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 5:
            raise ValueError("Nội dung góp ý cần ít nhất 5 ký tự.")
        return cleaned


async def _resolve_telegram_chat_id(
    client: httpx.AsyncClient,
    token: str,
    settings: Settings,
    db: Session,
) -> Optional[str]:
    if settings.telegram_chat_id:
        return settings.telegram_chat_id

    cached = db.query(AppSetting).filter(AppSetting.key == TELEGRAM_CHAT_ID_KEY).first()
    if cached and cached.value.strip():
        return cached.value.strip()

    # Auto-discover the latest chat that messaged /start to the bot if TELEGRAM_CHAT_ID is unset.
    try:
        resp = await client.get(
            f"https://api.telegram.org/bot{token}/getUpdates",
            params={"limit": 20},
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        if not data.get("ok"):
            return None
        updates = data.get("result") or []
        for item in reversed(updates):
            msg = item.get("message") or item.get("edited_message") or item.get("my_chat_member") or {}
            chat = msg.get("chat") or {}
            chat_id = chat.get("id")
            if chat_id is not None:
                resolved = str(chat_id)
                row = db.query(AppSetting).filter(AppSetting.key == TELEGRAM_CHAT_ID_KEY).first()
                if row:
                    row.value = resolved
                else:
                    db.add(AppSetting(key=TELEGRAM_CHAT_ID_KEY, value=resolved))
                db.commit()
                return resolved
    except Exception as exc:
        logger.warning("Failed to resolve Telegram chat_id via getUpdates: %s", type(exc).__name__)
    return None


def _build_telegram_html(payload: FeedbackSubmitRequest) -> str:
    cat_label = CATEGORY_LABELS.get(payload.category, "Góp ý")
    sender = html.escape((payload.sender_name or "").strip() or "Ẩn danh", quote=False)
    contact = html.escape((payload.contact or "").strip() or "Không để lại", quote=False)
    page = html.escape((payload.page_url or "").strip() or "-", quote=False)
    body = html.escape(payload.message.strip(), quote=False)

    text = (
        "📩 <b>Góp ý mới từ SnapQR</b>\n"
        f"• <b>Mục:</b> {html.escape(cat_label, quote=False)}\n"
        f"• <b>Người gửi:</b> {sender}\n"
        f"• <b>Liên hệ:</b> {contact}\n"
        f"• <b>Trang:</b> {page}\n\n"
        f"📝 <b>Nội dung:</b>\n{body}"
    )
    return text[:4000]


async def _send_to_telegram(
    payload: FeedbackSubmitRequest,
    settings: Settings,
    db: Session,
) -> bool:
    token = settings.telegram_bot_token
    if not token:
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            chat_id = await _resolve_telegram_chat_id(client, token, settings, db)
            if not chat_id:
                logger.info("Feedback stored in DB; Telegram chat_id not yet available (send /start to the bot).")
                return False

            text = _build_telegram_html(payload)
            send_resp = await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )
            if send_resp.status_code == 200 and send_resp.json().get("ok"):
                return True

            # Clear cached chat_id only if it came from auto-discovery and Telegram rejects the chat.
            if not settings.telegram_chat_id and send_resp.status_code == 400:
                db.query(AppSetting).filter(AppSetting.key == TELEGRAM_CHAT_ID_KEY).delete()
                db.commit()
            logger.warning("Telegram sendMessage returned HTTP %s", send_resp.status_code)
            return False
    except Exception as exc:
        logger.warning("Telegram feedback delivery failed: %s", type(exc).__name__)
        return False


@router.post("")
async def submit_feedback(
    payload: FeedbackSubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Receive user feedback, persist to DB, and notify the admin Telegram bot."""
    # Silently drop automated bot submissions that populate the hidden honeypot input.
    if payload.website and payload.website.strip():
        return {
            "ok": True,
            "delivered_telegram": False,
            "message": "Cảm ơn bạn đã gửi góp ý cho SnapQR!",
        }

    feedback_limiter.check(request, "feedback_submit")

    delivered = await _send_to_telegram(payload, settings, db)
    record = FeedbackMessage(
        category=payload.category,
        message=payload.message.strip(),
        sender_name=(payload.sender_name or "").strip()[:100] or None,
        contact=(payload.contact or "").strip()[:160] or None,
        page_url=(payload.page_url or "").strip()[:320] or None,
        telegram_delivered=delivered,
    )
    db.add(record)
    db.commit()

    return {
        "ok": True,
        "delivered_telegram": delivered,
        "message": "Cảm ơn bạn! Góp ý của bạn đã được gửi tới đội ngũ SnapQR.",
    }
