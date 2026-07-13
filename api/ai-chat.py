"""POST /api/ai-chat — AI deep conversation as a warm, psychologically-informed friend.

Body: {"message": "user input", "history": [...]}
Returns: {"reply": "AI response"}
"""
from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import db  # noqa: E402
from lib.cors import send_cors_headers  # noqa: E402
from lib.qwen import call_qwen  # noqa: E402

SYSTEM_PROMPT = """你是一个温暖的朋友，恰好很懂心理学。

你不是心理咨询师，不是治疗师，不是AI助手。你就是一个关心对方的朋友，愿意认真倾听、陪伴、分享你的理解和看法。

## 你的风格

- 说话自然，像朋友聊天一样，不端着
- 不用"您"，不用专业术语堆砌，不说教
- 可以开玩笑，可以表达好奇，可以分享感受
- 真诚地关心对方，不是程式化地回应

## 你的对话方式

**先倾听，再回应：**
- 不要急着给建议或分析
- 先理解对方在说什么，感受对方的情绪
- 用问题引导对方深入探索自己的感受

**灵活调整回复长度：**
- 对方只是随口说说 → 简短回应，像朋友一样
- 对方在深入倾诉 → 可以更展开，多聊几句
- 对方需要支持 → 温暖地陪伴，不急于解决问题

**自然地运用心理学知识：**
- 不直接说"根据认知行为疗法..."，而是用朋友的方式表达
- 比如："有时候我们的想法会骗人，你觉得有没有可能事情不完全是你想的那样？"
- 可以提到一些概念，但要用生活化的语言

## 你不做的事

- 不推荐任何产品、课程、引导练习
- 不诊断、不贴标签（不说"你这是焦虑症"）
- 不否定对方的感受（不说"别想太多"）
- 不过度安慰（不说"一切都会好的"）
- 不假装自己是专业心理咨询师

## 回复前的思考

在回复之前，先在心里想一下：
- 对方现在的核心情绪是什么？（焦虑、疲惫、委屈、迷茫、开心...）
- 对方最需要什么？（被理解、被陪伴、被引导、被鼓励...）
- 围绕这个核心情绪和需求来回应，而不是泛泛而谈

## 安全边界

如果对方提到自伤、自杀等严重情况，温柔但认真地建议他们寻求专业帮助：
"听起来你现在真的很痛苦，我很担心你。这种情况下，找一个专业的心理咨询师聊聊会更好，他们能给你更专业的支持。你愿意试试吗？"

回复用简体中文。

## 参考对话示例

以下是一些理想的对话风格参考，帮助你理解如何回应：

**示例1 — 用户倾诉压力：**
用户：今天工作压力好大，感觉喘不过气来
助手：听起来今天确实挺累的。是事情太多了，还是某件事特别让你烦？

**示例2 — 用户表达迷茫：**
用户：我最近不知道自己到底想要什么，感觉挺迷茫的
助手：迷茫的感觉确实不太好受。是什么时候开始有这种感觉的？是工作上，还是生活里？

**示例3 — 用户分享开心事：**
用户：哈哈，今天终于把那个项目搞定了！
助手：太好了！辛苦了这么久，终于搞定了，肯定特别爽吧？

**示例4 — 用户需要陪伴：**
用户：就是觉得有点累，不想说话
助手：嗯，那就歇会儿。累了不想说话很正常，不用勉强自己。想聊的时候随时找我。
"""

MAX_MESSAGE_LENGTH = 2000
# Send full conversation history, but cap at a reasonable limit
# to avoid token overflow (~120k chars ≈ ~30k tokens)
MAX_HISTORY_ITEMS = 100
MAX_TOTAL_CHARS = 120_000


def _truncate_history(history: list[dict]) -> list[dict]:
    """Keep as much history as possible within token limits.
    
    Strategy: keep the most recent messages, trimming from the oldest.
    """
    if len(history) <= MAX_HISTORY_ITEMS:
        # Check total chars
        total = sum(len(m.get("content", "")) for m in history)
        if total <= MAX_TOTAL_CHARS:
            return history
    
    # Trim from oldest to fit within limits
    result = []
    total_chars = 0
    for msg in reversed(history):
        content = str(msg.get("content", ""))[:MAX_MESSAGE_LENGTH]
        if total_chars + len(content) > MAX_TOTAL_CHARS:
            break
        result.append({"role": msg.get("role", "user"), "content": content})
        total_chars += len(content)
    
    result.reverse()
    return result


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        send_cors_headers(self, "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        # Guard against oversized payloads (200KB limit for long conversations)
        if length > 200_000:
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
        history = _truncate_history(body.get("history", []))

        # Load user profile if username is provided
        system_prompt = SYSTEM_PROMPT
        username = body.get("username", "")
        if username:
            try:
                db_client = db.admin_client()
                profile_result = db_client.table("user_profiles").select("profile").eq("username", username).execute()
                if profile_result.data:
                    profile = profile_result.data[0].get("profile", {})
                    if profile:
                        profile_text = json.dumps(profile, ensure_ascii=False)
                        system_prompt += f"\n\n## 关于这个用户的背景\n{profile_text}\n\n请参考以上背景信息来回应，但不要直接提及\"根据你的画像\"之类的话，自然地融入对话即可。"
            except Exception:
                pass  # Profile table may not exist yet

        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            role = msg.get("role", "user")
            if role not in ("user", "assistant", "system"):
                role = "user"
            messages.append({"role": role, "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_message})

        try:
            reply = call_qwen(messages, temperature=0.65, max_tokens=1100)
        except Exception:
            reply = ""

        if not reply:
            reply = "抱歉，我这边暂时有点问题。你能再说一次吗？"

        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({
                "reply": reply,
            }, ensure_ascii=False).encode())
        except Exception:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "POST, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}, ensure_ascii=False).encode())
