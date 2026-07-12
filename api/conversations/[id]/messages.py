"""POST /api/conversations/:id/messages — Save message to conversation"""
from __future__ import annotations

import json
import os
import sys
import uuid
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
from lib.cors import send_cors_headers
from lib import db


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
        # Extract conversation_id from path: /api/conversations/:id/messages
        parts = self.path.split("/")
        # ['', 'api', 'conversations', ':id', 'messages']
        if len(parts) != 5 or parts[4] != "messages":
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid path"}).encode())
            return

        conversation_id = parts[3]

        if not _validate_uuid(conversation_id):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid conversation ID"}).encode())
            return

        # Parse request body
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length)) if content_length > 0 else {}
        except (json.JSONDecodeError, ValueError):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            return

        # Validate required fields
        if "role" not in body or "content" not in body:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing required fields: role, content"}).encode())
            return

        # Validate role
        if body["role"] not in ("user", "assistant"):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid role. Must be 'user' or 'assistant'"}).encode())
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
                self.send_response(201)
                self.send_header("Content-Type", "application/json")
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps(message, ensure_ascii=False).encode())
            else:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Failed to save message"}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
