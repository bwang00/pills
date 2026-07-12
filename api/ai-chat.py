"""POST /api/ai-chat — Qwen AI chat for personalized guidance.

Body: {"message": "user input", "history": [...]}
Returns: {"reply": "AI response", "recommended_guide": "slug or null"}
"""
from __future__ import annotations

import json
import os
import re
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib.cors import send_cors_headers  # noqa: E402
from lib.qwen import call_qwen  # noqa: E402

SYSTEM_PROMPT = """你是 Pills 的 AI 引导助手，专门帮助用户在焦虑时冷静下来。

你的职责：
1. 温柔地倾听用户的状态描述
2. 根据情况推荐合适的引导方式（深呼吸、感官着陆、肌肉放松、正念冥想）
3. 可以生成个性化的引导文字
4. 保持简短、温暖、不啰嗦

回复用简体中文，语气平和温柔。每次回复不超过3句话。

可推荐的引导：
- breathing-478: 4-7-8呼吸法
- breathing-box: 方块呼吸
- grounding-54321: 5-4-3-2-1感官着陆
- muscle-relax-quick: 快速肌肉放松
- muscle-relax-full: 完整肌肉放松
- mindfulness-3: 3分钟正念冥想
- mindfulness-5: 5分钟正念冥想
- mindfulness-10: 10分钟深度冥想

如果推荐了某个引导，在回复末尾加上推荐标记，格式：[推荐:slug]
"""

MAX_MESSAGE_LENGTH = 2000
MAX_HISTORY_ITEMS = 10


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        send_cors_headers(self, "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        # Guard against oversized payloads (10KB limit)
        if length > 10_000:
            self.send_response(413)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Payload too large"}).encode())
            return

        body = json.loads(self.rfile.read(length)) if length else {}

        user_message = body.get("message", "")
        if not user_message or not isinstance(user_message, str):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "message is required"}).encode())
            return

        # Truncate overly long messages
        user_message = user_message[:MAX_MESSAGE_LENGTH]
        history = body.get("history", [])[:MAX_HISTORY_ITEMS]

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in history:
            role = msg.get("role", "user")
            if role not in ("user", "assistant", "system"):
                role = "user"
            content = str(msg.get("content", ""))[:MAX_MESSAGE_LENGTH]
            messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_message})

        try:
            reply = call_qwen(messages)
        except Exception:
            reply = ""

        if not reply:
            reply = "抱歉，AI 服务暂时不可用。你可以先试试深呼吸或感官着陆引导。"

        recommended = None
        if "[推荐:" in reply:
            match = re.search(r"\[推荐:([a-z0-9\-]+)\]", reply)
            if match:
                recommended = match.group(1)
                reply = re.sub(r"\[推荐:[^\]]+\]", "", reply).strip()

        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({
                "reply": reply,
                "recommended_guide": recommended,
            }, ensure_ascii=False).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}, ensure_ascii=False).encode())
