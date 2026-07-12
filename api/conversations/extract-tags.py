"""POST /api/conversations/extract-tags?conversation_id=xxx — Extract tags from conversation."""
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

        if not conversation_id:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing conversation_id parameter"}).encode())
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

            msg_result = db_client.table("conversation_messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
            messages = msg_result.data or []

            if not messages:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({"tags": []}).encode())
                return

            conversation_text = "\n".join([f"{'用户' if m['role']=='user' else '助手'}：{m['content']}" for m in messages])

            system_prompt = """你是一个话题标签提取助手。分析以下对话，提取 3-5 个关键话题标签。
标签应该是简短的中文词组（2-6 个字），比如"工作压力"、"人际关系"、"焦虑情绪"。
只返回 JSON 数组，格式：["标签 1", "标签 2", "标签 3"]"""

            result = call_qwen(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": conversation_text}
                ],
                temperature=0.3,
                max_tokens=200
            )

            tags = []
            try:
                cleaned = result.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("```", 2)[1] if "```" in cleaned[3:] else cleaned
                    if cleaned.startswith("json"):
                        cleaned = cleaned[4:]
                cleaned = cleaned.strip()
                tags = json.loads(cleaned)
                if not isinstance(tags, list):
                    tags = []
            except (json.JSONDecodeError, ValueError):
                tags = []

            if tags:
                db_client.table("conversation_tags").delete().eq("conversation_id", conversation_id).execute()
                for tag in tags:
                    if isinstance(tag, str) and tag.strip():
                        db_client.table("conversation_tags").insert({
                            "conversation_id": conversation_id,
                            "tag": tag.strip()
                        }).execute()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"tags": tags}, ensure_ascii=False).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
