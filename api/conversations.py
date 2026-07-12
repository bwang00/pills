"""Conversations API - CRUD operations for AI chat conversations.

Endpoints:
- POST /api/conversations - Create new conversation
- POST /api/conversations/:id/messages - Save message to conversation
- GET /api/conversations - List conversations with message_count
- GET /api/conversations/:id - Get conversation detail with messages
- DELETE /api/conversations/:id - Delete conversation (cascade deletes messages)
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import db  # noqa: E402
from lib.cors import send_cors_headers  # noqa: E402


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
        if self.path == "/api/conversations":
            self._create_conversation()
        elif self.path.startswith("/api/conversations/") and self.path.endswith("/messages"):
            self._save_message()
        else:
            _send_error_response(self, 404, "Not found")

    def do_GET(self):
        """Handle GET requests."""
        if self.path == "/api/conversations":
            self._list_conversations()
        elif self.path.startswith("/api/conversations/"):
            parts = self.path.split("/")
            # ['', 'api', 'conversations', ':id']
            if len(parts) == 4:
                self._get_conversation_detail(parts[3])
            else:
                _send_error_response(self, 404, "Not found")
        else:
            _send_error_response(self, 404, "Not found")

    def do_DELETE(self):
        """Handle DELETE requests."""
        if self.path.startswith("/api/conversations/"):
            parts = self.path.split("/")
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

    def _save_message(self):
        """Save a message to a conversation."""
        # Extract conversation_id from path: /api/conversations/:id/messages
        parts = self.path.split("/")
        # ['', 'api', 'conversations', ':id', 'messages']
        if len(parts) != 5 or parts[4] != "messages":
            _send_error_response(self, 400, "Invalid path")
            return

        conversation_id = parts[3]

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

    def _list_conversations(self):
        """List all conversations with message count, ordered by updated_at DESC."""
        try:
            db_client = db.admin_client()

            # Get conversations ordered by updated_at DESC
            result = db_client.table("conversations").select("*").order("updated_at", desc=True).execute()

            conversations = []
            for conv in result.data or []:
                # Get message count for each conversation
                msg_result = db_client.table("conversation_messages").select("id", count="exact").eq("conversation_id", conv["id"]).execute()
                conv["message_count"] = msg_result.count or 0
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
