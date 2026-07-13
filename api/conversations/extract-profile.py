"""POST /api/conversations/extract-profile?conversation_id=xxx&username=xxx — Extract/update user profile from conversation."""
from __future__ import annotations

import json
import os
import sys
import uuid
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from lib import db
from lib.cors import send_cors_headers
from lib.qwen import call_qwen


def _validate_uuid(conversation_id: str) -> bool:
    try:
        uuid.UUID(conversation_id)
        return True
    except (ValueError, AttributeError):
        return False


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        send_cors_headers(self, "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        conversation_id = params.get("conversation_id", [None])[0]
        username = params.get("username", [None])[0]

        if not conversation_id or not username:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing conversation_id or username parameter"}).encode())
            return

        if not _validate_uuid(conversation_id):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid conversation ID"}).encode())
            return

        try:
            db_client = db.admin_client()

            # Fetch messages from this conversation
            msg_result = db_client.table("conversation_messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
            messages = msg_result.data or []

            if not messages:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({"profile": {}}).encode())
                return

            # Load existing profile if any
            existing_profile = {}
            try:
                profile_result = db_client.table("user_profiles").select("profile").eq("username", username).execute()
                if profile_result.data:
                    existing_profile = profile_result.data[0].get("profile", {})
            except Exception:
                pass  # Table may not exist yet

            conversation_text = "\n".join([f"{'用户' if m['role']=='user' else '助手'}：{m['content']}" for m in messages])

            existing_text = ""
            if existing_profile:
                existing_text = f"\n\n当前已有画像：\n{json.dumps(existing_profile, ensure_ascii=False)}"

            system_prompt = """你是一个用户画像提取助手。分析以下对话，提取或更新用户的简要画像。

画像应包含以下维度（JSON 格式）：
- recent_topics: 最近主要话题（数组，2-5个简短词组）
- emotional_trend: 近期情绪趋势（一句话描述）
- tried_methods: 已尝试过的方法（数组，可为空）
- communication_style: 用户偏好的沟通方式（一句话描述）
- summary: 对这个用户的整体了解（2-3句话）

要求：
- 基于对话内容客观提取，不要编造
- 如果对话信息不足以填充某个维度，可以留空或用简短描述
- 如果已有画像，请合并更新（保留旧信息，加入新信息）
- 只返回 JSON 对象，不要返回其他内容"""

            user_prompt = f"请分析以下对话，提取/更新用户画像。{existing_text}\n\n对话内容：\n{conversation_text}"

            result = call_qwen(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            # Parse JSON response
            profile = {}
            try:
                cleaned = result.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("```", 2)[1] if "```" in cleaned[3:] else cleaned
                    if cleaned.startswith("json"):
                        cleaned = cleaned[4:]
                cleaned = cleaned.strip()
                profile = json.loads(cleaned)
                if not isinstance(profile, dict):
                    profile = {}
            except (json.JSONDecodeError, ValueError):
                profile = {}

            # Upsert profile
            if profile:
                try:
                    db_client.table("user_profiles").upsert({
                        "username": username,
                        "profile": profile
                    }).execute()
                except Exception:
                    pass  # Table may not exist yet

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"profile": profile}, ensure_ascii=False).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
