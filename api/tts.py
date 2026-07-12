"""POST /api/tts — Cloud TTS via edge-tts (Microsoft Edge).

Body: {"text": "text to speak"}
Returns audio MP3 base64: {"audio_data": "base64...", "format": "mp3"}
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib.cors import send_cors_headers  # noqa: E402

# Best Chinese female voice - warm, natural, calming
VOICE = "zh-CN-XiaoxiaoNeural"
MAX_TEXT_LENGTH = 500
MAX_PAYLOAD_BYTES = 10_000


def _generate_tts(text: str) -> bytes:
    """Generate MP3 audio using edge-tts."""
    import edge_tts

    async def _gen():
        communicate = edge_tts.Communicate(text, VOICE, rate="-10%", pitch="+5Hz")
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        return buf.getvalue()

    return asyncio.run(_gen())


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        send_cors_headers(self, "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_PAYLOAD_BYTES:
            self.send_response(413)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Payload too large"}).encode())
            return

        body = json.loads(self.rfile.read(length)) if length else {}

        text = body.get("text", "")
        if not text or not isinstance(text, str):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "text is required"}).encode())
            return

        text = text[:MAX_TEXT_LENGTH]

        try:
            audio_bytes = _generate_tts(text)
            audio_b64 = base64.b64encode(audio_bytes).decode("ascii")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({
                "audio_data": audio_b64,
                "format": "mp3",
                "size": len(audio_bytes),
            }).encode())
        except Exception:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "TTS generation failed"}, ensure_ascii=False).encode())
