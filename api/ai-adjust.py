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

ADJUST_PROMPT = """你是引导调整助手。用户正在进行一项放松引导练习，提供了反馈。

根据反馈，给出简短的鼓励和一个具体的调整建议。
回复格式（JSON）：
{"suggestion": "简短温暖的文字（1-2句）", "adjustments": {"duration_modifier": 0.8到1.5之间的数字}}

duration_modifier 含义：<1 加快节奏，>1 放慢节奏，1.0 不变。
只回复JSON，不要其他文字。"""


def _call_qwen(messages: list[dict]) -> str:
    import urllib.request
    api_key = os.environ.get("QWEN_API_KEY", "")
    if not api_key:
        return json.dumps({"suggestion": "继续按照你的节奏来", "adjustments": {"duration_modifier": 1.0}}, ensure_ascii=False)

    payload = json.dumps({
        "model": "qwen3.7-plus",
        "messages": messages,
        "temperature": 0.5,
        "max_tokens": 200,
    }).encode()

    req = urllib.request.Request(
        "https://ws-os2hjo7wanzpcewt.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"]
    except Exception:
        return json.dumps({"suggestion": "继续按照你的节奏来", "adjustments": {"duration_modifier": 1.0}}, ensure_ascii=False)


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

        guide_type = body.get("guide_type", "breathing")
        user_input = body.get("user_input", "")
        current_phase = body.get("current_phase", "")

        user_msg = f"引导类型: {guide_type}, 当前阶段: {current_phase}, 用户反馈: {user_input}"
        messages = [
            {"role": "system", "content": ADJUST_PROMPT},
            {"role": "user", "content": user_msg},
        ]

        raw = _call_qwen(messages)
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {"suggestion": "继续按照你的节奏来", "adjustments": {"duration_modifier": 1.0}}

        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode())
