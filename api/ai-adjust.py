"""POST /api/ai-adjust — AI dynamic adjustment during a guide.

Body: {"guide_type": "breathing", "user_input": "too fast", "current_phase": "inhale"}
Returns: {"suggestion": "AI suggestion text", "adjustments": {"duration_modifier": 1.2}}
"""
from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib.cors import send_cors_headers  # noqa: E402
from lib.qwen import call_qwen  # noqa: E402

ADJUST_PROMPT = """你是引导调整助手。用户正在进行一项放松引导练习，提供了反馈。

根据反馈，给出简短的鼓励和一个具体的调整建议。
回复格式（JSON）：
{"suggestion": "简短温暖的文字（1-2句）", "adjustments": {"duration_modifier": 0.8到1.5之间的数字}}

duration_modifier 含义：<1 加快节奏，>1 放慢节奏，1.0 不变。
只回复JSON，不要其他文字。"""

DEFAULT_RESULT = {"suggestion": "继续按照你的节奏来", "adjustments": {"duration_modifier": 1.0}}
MAX_INPUT_LENGTH = 500


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        send_cors_headers(self, "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > 5_000:
            self.send_response(413)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Payload too large"}).encode())
            return

        body = json.loads(self.rfile.read(length)) if length else {}

        guide_type = str(body.get("guide_type", "breathing"))[:50]
        user_input = str(body.get("user_input", ""))[:MAX_INPUT_LENGTH]
        current_phase = str(body.get("current_phase", ""))[:50]

        user_msg = f"引导类型: {guide_type}, 当前阶段: {current_phase}, 用户反馈: {user_input}"
        messages = [
            {"role": "system", "content": ADJUST_PROMPT},
            {"role": "user", "content": user_msg},
        ]

        try:
            raw = call_qwen(messages, temperature=0.5, max_tokens=200)
            result = json.loads(raw)
            # Validate structure
            if not isinstance(result.get("suggestion"), str):
                result = DEFAULT_RESULT
            modifier = result.get("adjustments", {}).get("duration_modifier", 1.0)
            if not isinstance(modifier, (int, float)) or modifier < 0.5 or modifier > 2.0:
                result["adjustments"] = {"duration_modifier": 1.0}
        except (json.JSONDecodeError, Exception):
            result = DEFAULT_RESULT

        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode())
        except Exception:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}, ensure_ascii=False).encode())
