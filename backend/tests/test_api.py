"""API integration tests for SnapQR backend (Media QR lifecycle, Range streaming, XSS/SSRF guards)."""

from pathlib import Path
import io
import os
import sys
import tempfile

from fastapi.testclient import TestClient

_TMP_DIR = tempfile.TemporaryDirectory(prefix="snapqr_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TMP_DIR.name) / 'test.db'}"
os.environ["LOCAL_STORAGE_DIR"] = str(Path(_TMP_DIR.name) / "uploads")
os.environ["STORAGE_BACKEND"] = "local"

# Add backend root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services.social_dl import _curate_formats  # noqa: E402


def test_social_format_curation() -> None:
    # TikTok: ensure watermarked 'download' format is skipped in favor of clean MP4
    tiktok_info = {
        "extractor_key": "TikTok",
        "formats": [
            {"format_id": "download", "vcodec": "h264", "acodec": "aac", "ext": "mp4", "height": 1080, "format_note": "watermarked"},
            {"format_id": "h264_1080p_0", "vcodec": "h264", "acodec": "aac", "ext": "mp4", "height": 1080, "tbr": 2200},
            {"format_id": "h264_720p_0", "vcodec": "h264", "acodec": "aac", "ext": "mp4", "height": 720, "tbr": 1200},
        ],
    }
    curated = _curate_formats(tiktok_info, has_modern_ffmpeg=False)
    ids = [c["id"] for c in curated]
    assert "download" not in ids
    assert "h264_1080p_0" in ids
    assert curated[0]["watermark_free"] is True

    # YouTube: with modern ffmpeg, offers merged HD; without modern ffmpeg, uses progressive cleanly
    yt_info = {
        "extractor_key": "Youtube",
        "formats": [
            {"format_id": "137", "vcodec": "avc1", "acodec": "none", "ext": "mp4", "height": 1080},
            {"format_id": "18", "vcodec": "avc1", "acodec": "mp4a", "ext": "mp4", "height": 360},
            {"format_id": "140", "vcodec": "none", "acodec": "mp4a", "ext": "m4a", "abr": 128},
        ],
    }
    yt_with_ff = _curate_formats(yt_info, has_modern_ffmpeg=True)
    assert any("137+bestaudio" in c["id"] for c in yt_with_ff)
    yt_no_ff = _curate_formats(yt_info, has_modern_ffmpeg=False)
    assert any(c["id"] == "18" for c in yt_no_ff)


def run_tests() -> None:
    with TestClient(app) as client:
        # 1. Health check
        health = client.get("/api/health")
        assert health.status_code == 200, health.text
        hdata = health.json()
        assert hdata["status"] == "ok"
        assert hdata["storage_mode"] in {"local", "s3"}

        # 2. Upload MP4 video stub
        video_bytes = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"
        up_res = client.post(
            "/api/media/upload",
            data={"title": "Test Video Clip", "expiry_days": "7"},
            files={"file": ("clip.mp4", io.BytesIO(video_bytes), "video/mp4")},
        )
        assert up_res.status_code == 200, up_res.text
        created = up_res.json()
        code = created["code"]
        edit_token = created["edit_token"]
        assert created["media_kind"] == "video"
        assert created["file_size"] == len(video_bytes)

        # 3. View metadata + track_view increment
        meta = client.get(f"/api/media/{code}?track_view=true")
        assert meta.status_code == 200
        assert meta.json()["view_count"] == 1
        assert "edit_token_hash" not in meta.json()

        # 4. Range request for iOS Safari / mobile video playback
        range_res = client.get(
            f"/api/media/{code}/file",
            headers={"Range": "bytes=0-7"},
        )
        assert range_res.status_code == 206, range_res.text
        assert range_res.headers["content-range"] == f"bytes 0-7/{len(video_bytes)}"
        assert range_res.content == video_bytes[:8]

        # 5. Download count increment
        dl_res = client.get(f"/api/media/{code}/file?download=1")
        assert dl_res.status_code == 200
        assert "attachment" in dl_res.headers["content-disposition"]
        meta_after = client.get(f"/api/media/{code}").json()
        assert meta_after["download_count"] == 1

        # 6. Dynamic QR Replace file (with wrong token rejected, right token succeeds)
        bad_replace = client.put(
            f"/api/media/{code}/file",
            headers={"X-Edit-Token": "wrong-token"},
            files={"file": ("new.pdf", io.BytesIO(b"%PDF-1.4\nhello"), "application/pdf")},
        )
        assert bad_replace.status_code == 403

        good_replace = client.put(
            f"/api/media/{code}/file",
            headers={"X-Edit-Token": edit_token},
            files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4\nupdated"), "application/pdf")},
        )
        assert good_replace.status_code == 200, good_replace.text
        assert good_replace.json()["code"] == code
        assert good_replace.json()["media_kind"] == "pdf"

        # 7. Stored XSS protection: SVG/HTML upload must force attachment + sandbox
        xss_up = client.post(
            "/api/media/upload",
            files={"file": ("evil.svg", io.BytesIO(b"<svg onload=alert(1)></svg>"), "image/svg+xml")},
        )
        assert xss_up.status_code == 200
        xss_code = xss_up.json()["code"]
        xss_token = xss_up.json()["edit_token"]
        xss_serve = client.get(f"/api/media/{xss_code}/file")
        assert xss_serve.status_code == 200
        assert xss_serve.headers["content-disposition"].startswith("attachment")
        assert xss_serve.headers.get("content-security-policy") == "sandbox"

        # 8. SSRF protection on social inspect and image proxy
        ssrf_res = client.post("/api/social/inspect", json={"url": "http://127.0.0.1:8000/api/health"})
        assert ssrf_res.status_code == 400
        ssrf_meta = client.get("/api/social/proxy-image?url=http://169.254.169.254/latest/meta-data/")
        assert ssrf_meta.status_code == 400

        # 9. Feedback endpoint: validation, honeypot, and mocked Telegram HTML-safe delivery
        bad_fb = client.post("/api/feedback", json={"category": "bug", "message": "hi"})
        assert bad_fb.status_code == 422

        spam_fb = client.post(
            "/api/feedback",
            json={"category": "other", "message": "Spam bot content", "website": "https://spam.example"},
        )
        assert spam_fb.status_code == 200
        assert spam_fb.json()["delivered_telegram"] is False

        import app.routers.feedback as fb_mod

        sent_payloads = []

        class _MockResp:
            def __init__(self, status_code: int, payload: dict) -> None:
                self.status_code = status_code
                self._payload = payload

            def json(self):
                return self._payload

        class _MockAsyncClient:
            def __init__(self, *args, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return False

            async def get(self, url, params=None):
                assert "getUpdates" in url
                return _MockResp(200, {"ok": True, "result": [{"message": {"chat": {"id": 999888777}}}]})

            async def post(self, url, json=None):
                assert "sendMessage" in url
                sent_payloads.append(json)
                return _MockResp(200, {"ok": True, "result": {"message_id": 1}})

        orig_client = fb_mod.httpx.AsyncClient
        from app.config import get_settings as _get_settings

        orig_token = _get_settings().telegram_bot_token
        orig_chat = _get_settings().telegram_chat_id
        _get_settings().telegram_bot_token = "12345:MOCK_TEST_TOKEN"
        _get_settings().telegram_chat_id = ""
        fb_mod.httpx.AsyncClient = _MockAsyncClient
        try:
            ok_fb = client.post(
                "/api/feedback",
                json={
                    "category": "feature",
                    "message": "Thêm khung Noel <script>alert(1)</script> nhé!",
                    "sender_name": "Huy <admin>",
                    "contact": "@huy_tele",
                },
            )
            assert ok_fb.status_code == 200, ok_fb.text
            assert ok_fb.json()["delivered_telegram"] is True
            assert len(sent_payloads) == 1
            assert sent_payloads[0]["chat_id"] == "999888777"
            assert "&lt;script&gt;" in sent_payloads[0]["text"]
            assert "<script>" not in sent_payloads[0]["text"]
            assert "Huy &lt;admin&gt;" in sent_payloads[0]["text"]
        finally:
            fb_mod.httpx.AsyncClient = orig_client
            _get_settings().telegram_bot_token = orig_token
            _get_settings().telegram_chat_id = orig_chat

        # 10. Cleanup delete
        del_res = client.delete(f"/api/media/{code}", headers={"X-Edit-Token": edit_token})
        assert del_res.status_code == 200
        assert client.get(f"/api/media/{code}").status_code == 404
        client.delete(f"/api/media/{xss_code}", headers={"X-Edit-Token": xss_token})

    print("ALL BACKEND API & SECURITY TESTS PASSED!")


if __name__ == "__main__":
    test_social_format_curation()
    run_tests()
    engine.dispose()
