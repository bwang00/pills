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

# Best Chinese female voice - warm, natural, calming
VOICE = "zh-CN-XiaoxiaoNeural"


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


def _cors_headers(h: BaseHTTPRequestHandler):
    h.send_header("Access-Control-Allow-Origin", "*")
    h.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        _cors_headers(self)
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        text = body.get("text", "")
        if not text:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "No text provided"}).encode())
            return

        try:
            audio_bytes = _generate_tts(text[:500])
            audio_b64 = base64.b64encode(audio_bytes).decode("ascii")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({
                "audio_data": audio_b64,
                "format": "mp3",
                "size": len(audio_bytes),
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"TTS generation failed: {str(e)[:100]}"
            }, ensure_ascii=False).encode())
