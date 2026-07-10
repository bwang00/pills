"""POST /api/ai-chat — Qwen AI chat for personalized guidance.

Body: {"message": "user input", "history": [...]}
Returns: {"reply": "AI response", "recommended_guide": "slug or null"}
"""
from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

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


def _call_qwen(messages: list[dict]) -> str:
    """Call Qwen API via DashScope."""
    import urllib.request

    api_key = os.environ.get("QWEN_API_KEY", "")
    if not api_key:
        return "抱歉，AI 服务暂时不可用。你可以先试试深呼吸或感官着陆引导。"

    payload = json.dumps({
        "model": "qwen-plus",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 300,
    }).encode()

    req = urllib.request.Request(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"AI 暂时遇到了问题，请先尝试其他引导方式。（{str(e)[:50]}）"


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

        user_message = body.get("message", "")
        history = body.get("history", [])

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in history[-10:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_message})

        reply = _call_qwen(messages)

        recommended = None
        if "[推荐:" in reply:
            import re
            match = re.search(r"\[推荐:([a-z0-9\-]+)\]", reply)
            if match:
                recommended = match.group(1)
                reply = re.sub(r"\[推荐:[^\]]+\]", "", reply).strip()

        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({
                "reply": reply,
                "recommended_guide": recommended,
            }, ensure_ascii=False).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode())
