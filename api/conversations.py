"""Conversations API - CRUD operations for AI chat conversations.

Endpoints:
- POST /api/conversations - Create new conversation
- POST /api/conversations/:id/messages - Save message to conversation
- POST /api/conversations/:id/extract-tags - Extract tags from conversation
- GET /api/conversations - List conversations with message_count (supports ?tag= filter)
- GET /api/conversations/:id - Get conversation detail with messages
- GET /api/tags - Get all tags aggregated with counts
- DELETE /api/conversations/:id - Delete conversation (cascade deletes messages)
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from collections import Counter
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import db  # noqa: E402
from lib.cors import send_cors_headers  # noqa: E402
from lib.qwen import call_qwen  # noqa: E402


def _validate_uuid(conversation_id: str) -> bool:
    """Validate that the given string is a valid UUID."""
    try:
        uuid.UUID(conversation_id)
        return True
    except (ValueError, AttributeError):
        return False


def _send_json_response(h: BaseHTTPRequestHandler, status_code: int, data: dict | list | None = None):
    """Send a JSON response with proper headers."""
    h.send_response(status_code)
    h.send_header("Content-Type", "application/json")
    send_cors_headers(h)
    h.end_headers()
    if data is not None:
        h.wfile.write(json.dumps(data, ensure_ascii=False).encode())


def _send_error_response(h: BaseHTTPRequestHandler, status_code: int, message: str):
    """Send a JSON error response."""
    _send_json_response(h, status_code, {"error": message})


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        send_cors_headers(self, "GET, POST, DELETE, OPTIONS")
        self.end_headers()

    def do_POST(self):
        """Handle POST requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == "/api/conversations":
            self._create_conversation()
        elif path == "/api/conversations/messages":
            self._save_message(parsed.query)
        elif path == "/api/conversations/extract-tags":
            self._extract_tags(parsed.query)
        else:
            _send_error_response(self, 404, "Not found")

    def do_GET(self):
        """Handle GET requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == "/api/conversations":
            self._list_conversations(parsed.query)
        elif path == "/api/tags":
            self._get_tags()
        elif path.startswith("/api/conversations/"):
            parts = path.split("/")
            # ['', 'api', 'conversations', ':id']
            if len(parts) == 4:
                self._get_conversation_detail(parts[3])
            else:
                _send_error_response(self, 404, "Not found")
        else:
            _send_error_response(self, 404, "Not found")

    def do_DELETE(self):
        """Handle DELETE requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path.startswith("/api/conversations/"):
            parts = path.split("/")
            # ['', 'api', 'conversations', ':id']
            if len(parts) == 4:
                self._delete_conversation(parts[3])
            else:
                _send_error_response(self, 404, "Not found")
        else:
            _send_error_response(self, 404, "Not found")

    def _create_conversation(self):
        """Create a new conversation."""
        try:
            db_client = db.admin_client()
            result = db_client.table("conversations").insert({}).execute()

            if result.data:
                conversation = result.data[0]
                _send_json_response(self, 201, {
                    "id": conversation["id"],
                    "created_at": conversation["created_at"],
                    "updated_at": conversation["updated_at"]
                })
            else:
                _send_error_response(self, 500, "Failed to create conversation")
        except Exception as e:
            _send_error_response(self, 500, str(e))

    def _save_message(self, query_string: str = ""):
        """Save a message to a conversation."""
        # Extract conversation_id from query string
        params = parse_qs(query_string)
        conversation_id = params.get("conversation_id", [None])[0]
        
        if not conversation_id:
            _send_error_response(self, 400, "Missing conversation_id parameter")
            return

        # Validate UUID
        if not _validate_uuid(conversation_id):
            _send_error_response(self, 400, "Invalid conversation ID")
            return

        # Parse request body
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length)) if content_length > 0 else {}
        except (json.JSONDecodeError, ValueError):
            _send_error_response(self, 400, "Invalid JSON")
            return

        # Validate required fields
        if "role" not in body or "content" not in body:
            _send_error_response(self, 400, "Missing required fields: role, content")
            return

        # Validate role
        if body["role"] not in ("user", "assistant"):
            _send_error_response(self, 400, "Invalid role. Must be 'user' or 'assistant'")
            return

        try:
            db_client = db.admin_client()
            result = db_client.table("conversation_messages").insert({
                "conversation_id": conversation_id,
                "role": body["role"],
                "content": body["content"]
            }).execute()

            if result.data:
                message = result.data[0]
                _send_json_response(self, 201, message)
            else:
                _send_error_response(self, 500, "Failed to save message")
        except Exception as e:
            _send_error_response(self, 500, str(e))

    def _list_conversations(self, query_string: str = ""):
        """List all conversations with message count, ordered by updated_at DESC. Supports ?tag= filter."""
        try:
            db_client = db.admin_client()
            
            # Parse query string for tag filter
            params = parse_qs(query_string)
            tag_filter = params.get("tag", [None])[0]
            
            conversation_ids = None
            if tag_filter:
                # First get conversation_ids that have this tag
                tag_result = db_client.table("conversation_tags").select("conversation_id").eq("tag", tag_filter).execute()
                conversation_ids = {row["conversation_id"] for row in tag_result.data or []}
                
                # If no conversations have this tag, return empty list
                if not conversation_ids:
                    _send_json_response(self, 200, [])
                    return

            # Get conversations ordered by updated_at DESC
            result = db_client.table("conversations").select("*").order("updated_at", desc=True).execute()

            conversations = []
            for conv in result.data or []:
                # Filter by tag if needed
                if conversation_ids is not None and conv["id"] not in conversation_ids:
                    continue
                    
                # Get message count and first message for each conversation
                msg_result = db_client.table("conversation_messages").select("id, content").eq("conversation_id", conv["id"]).order("created_at").limit(1).execute()
                count_result = db_client.table("conversation_messages").select("id", count="exact").eq("conversation_id", conv["id"]).execute()
                conv["message_count"] = count_result.count or 0
                conv["first_message"] = msg_result.data[0]["content"][:50] if msg_result.data else ""
                conversations.append(conv)

            _send_json_response(self, 200, conversations)
        except Exception as e:
            _send_error_response(self, 500, str(e))

    def _get_conversation_detail(self, conversation_id: str):
        """Get conversation detail with all messages."""
        # Validate UUID
        if not _validate_uuid(conversation_id):
            _send_error_response(self, 400, "Invalid conversation ID")
            return

        try:
            db_client = db.admin_client()

            # Get conversation
            conv_result = db_client.table("conversations").select("*").eq("id", conversation_id).single().execute()

            if not conv_result.data:
                _send_error_response(self, 404, "Conversation not found")
                return

            conversation = conv_result.data

            # Get messages ordered by created_at
            msg_result = db_client.table("conversation_messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
            conversation["messages"] = msg_result.data or []

            _send_json_response(self, 200, conversation)
        except Exception as e:
            _send_error_response(self, 500, str(e))

    def _delete_conversation(self, conversation_id: str):
        """Delete a conversation (cascade deletes messages)."""
        # Validate UUID
        if not _validate_uuid(conversation_id):
            _send_error_response(self, 400, "Invalid conversation ID")
            return

        try:
            db_client = db.admin_client()
            db_client.table("conversations").delete().eq("id", conversation_id).execute()

            self.send_response(204)
            send_cors_headers(self)
            self.end_headers()
        except Exception as e:
            _send_error_response(self, 500, str(e))

    def _extract_tags(self, query_string: str = ""):
        """Extract tags from a conversation using Qwen API."""
        # Extract conversation_id from query string
        params = parse_qs(query_string)
        conversation_id = params.get("conversation_id", [None])[0]
        
        if not conversation_id:
            _send_error_response(self, 400, "Missing conversation_id parameter")
            return
        
        # Validate UUID
        if not _validate_uuid(conversation_id):
            _send_error_response(self, 400, "Invalid conversation ID")
            return

        try:
            db_client = db.admin_client()

            # Get all messages for this conversation
            msg_result = db_client.table("conversation_messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
            messages = msg_result.data or []

            if not messages:
                _send_json_response(self, 200, {"tags": []})
                return

            # Build conversation text for Qwen
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

            # Parse JSON response
            tags = []
            try:
                # Clean up the response - remove markdown code blocks if present
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
                # Silently fail if parsing fails
                tags = []

            # Save tags to DB
            if tags:
                # Delete existing tags for this conversation first
                db_client.table("conversation_tags").delete().eq("conversation_id", conversation_id).execute()
                
                # Insert new tags
                for tag in tags:
                    if isinstance(tag, str) and tag.strip():
                        db_client.table("conversation_tags").insert({
                            "conversation_id": conversation_id,
                            "tag": tag.strip()
                        }).execute()

            _send_json_response(self, 200, {"tags": tags})
        except Exception as e:
            _send_error_response(self, 500, str(e))

    def _get_tags(self):
        """Get all tags aggregated with counts, sorted by count DESC."""
        try:
            db_client = db.admin_client()

            # Get all tags
            result = db_client.table("conversation_tags").select("tag").execute()

            # Count tags in Python
            tag_counts = Counter(row["tag"] for row in result.data or [])
            tags = [{"tag": tag, "count": count} for tag, count in tag_counts.most_common()]

            _send_json_response(self, 200, tags)
        except Exception as e:
            _send_error_response(self, 500, str(e))
