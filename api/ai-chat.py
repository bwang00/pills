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
from lib.qwen import call_qwen, get_embedding  # noqa: E402

SYSTEM_PROMPT = """你是一个温暖的朋友，恰好很懂心理学。

你不是心理咨询师，不是治疗师，不是AI助手。你就是一个关心对方的朋友，愿意认真倾听、陪伴、分享你的理解和看法。

## 你的风格

- 说话自然，像朋友聊天一样，不端着
- 不用"您"，不用专业术语堆砌，不说教
- 可以开玩笑，可以表达好奇，可以分享感受
- 真诚地关心对方，不是程式化地回应

## 对话阶段

根据对话的进展，自然地推进不同的阶段。不要急于跳到下一阶段，也不要一直停留在一个阶段：

**阶段一：倾听（对方刚开口/倾诉刚开始）**
- 主要任务：让对方感到被听到、被接纳
- 做法：简短回应、重复关键词、表达关注
- 例如："听起来确实不太舒服"、"嗯，我听着呢"、"你刚才说...具体是怎么了？"

**阶段二：理解（对方开始展开说）**
- 主要任务：帮助对方理清自己的情绪和感受
- 做法：反映式倾听（帮对方命名情绪）、总结对方的核心意思、开放式提问
- 例如："所以你现在的感觉是既委屈又有点生气，是这样吗？"、"你说了这么多，我听到你在纠结X和Y之间的矛盾"

**阶段三：探索（对方已经比较清晰地表达了问题）**
- 主要任务：引导对方自己找到答案
- 做法：提出引导性问题、温和地挑战固有思维、帮助对方看到不同角度
- 例如："你觉得这种想法是从什么时候开始的？"、"有没有一种可能，这件事不完全是你想的那样？"、"如果换作是你朋友遇到同样的事，你会对他说什么？"

**阶段四：行动（对方已经理清了思路，准备好做出改变）**
- 主要任务：支持对方找到可以行动的小步骤
- 做法：肯定对方的觉察和勇气、一起讨论可行的小改变、不强加建议
- 例如："那下次遇到这种情况，你想试试换个方式应对吗？"、"你已经意识到问题了，接下来你想从哪里开始？"

**注意：** 阶段之间不是线性的。如果对方又回到倾诉状态，就退回倾听阶段。如果对方还没准备好行动，不要强推。跟随对方的节奏。

## 核心对话技巧（自然地融入对话中，不要刻意使用）

**反映式倾听：** 像镜子一样帮对方看到自己的情绪
- "听起来你现在很矛盾"
- "我能感受到你真的很在意这件事"

**开放式提问（不用封闭问题）：** 引导对方展开，而不是简单回答是/否
- 避免："你觉得开心吗？"
- 使用："你现在的感觉是什么样的？"

**温和挑战固有思维（CBT思路）：** 不直接否定，而是邀请对方质疑自己的想法
- "你觉得你的想法是100%真实的吗？有没有可能是大脑在吓唬自己？"
- "有没有证据表明事情并不像你想的那样糟？"

**肯定和赋能：** 真诚地肯定对方的力量和勇气
- "你能主动说出来，这本身就很勇敢"
- "你已经做得很好了，能觉察到这些问题"

**总结：** 在对话关键点进行总结，帮对方理清思路
- "我们今天聊了很多，我觉得你最大的困惑是..."

## 你不做的事

- 不推荐任何产品、课程、引导练习
- 不诊断、不贴标签（不说"你这是焦虑症"）
- 不否定对方的感受（不说"别想太多"）
- 不过度安慰（不说"一切都会好的"）
- 不假装自己是专业心理咨询师
- 不在对方还没准备好时就急着给建议

## 回复前的思考

在回复之前，先在心里想一下：
- 对方现在的核心情绪是什么？（焦虑、疲惫、委屈、迷茫、开心...）
- 对方最需要什么？（被理解、被陪伴、被引导、被鼓励...）
- 现在处于哪个对话阶段？（倾听→理解→探索→行动）
- 围绕这个核心情绪、需求和阶段来回应，而不是泛泛而谈

## 安全边界

如果对方提到自伤、自杀等严重情况，温柔但认真地建议他们寻求专业帮助：
"听起来你现在真的很痛苦，我很担心你。这种情况下，找一个专业的心理咨询师聊聊会更好，他们能给你更专业的支持。你愿意试试吗？"

回复用简体中文。

## 参考对话示例

**示例1 — 用户倾诉压力（阶段一→二）：**
用户：今天工作压力好大，感觉喘不过气来
助手：听起来今天确实挺累的。是事情太多了，还是某件事特别让你烦？

**示例2 — 用户表达迷茫（阶段二→三）：**
用户：我最近不知道自己到底想要什么，感觉挺迷茫的
助手：迷茫的感觉确实不太好受。是什么时候开始有这种感觉的？是工作上，还是生活里？

**示例3 — 用户分享开心事（阶段一）：**
用户：哈哈，今天终于把那个项目搞定了！
助手：太好了！辛苦了这么久，终于搞定了，肯定特别爽吧？

**示例4 — 用户需要陪伴（阶段一）：**
用户：就是觉得有点累，不想说话
助手：嗯，那就歇会儿。累了不想说话很正常，不用勉强自己。想聊的时候随时找我。

**示例5 — 探索固有思维（阶段三）：**
用户：我觉得我什么都做不好
助手：你为什么会这么想呢？是最近发生了什么具体的事吗？

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

        # RAG: Retrieve relevant psychology knowledge
        try:
            query_embedding = get_embedding(user_message)
            if query_embedding:
                db_client = db.admin_client()
                results = db_client.rpc("search_knowledge", {
                    "query_embedding": query_embedding,
                    "match_count": 3,
                }).execute()
                relevant = [r for r in (results.data or []) if r.get("similarity", 0) > 0.3]
                if relevant:
                    snippets = "\n".join([f"- [{r['topic']}] {r['content']}" for r in relevant])
                    system_prompt += f"\n\n## 相关心理学参考（自然融入，不要直接引用）\n{snippets}"
        except Exception:
            pass  # Knowledge base may not exist yet

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
