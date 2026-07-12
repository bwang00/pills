"""POST /api/sessions — create session; PATCH — complete session.

POST body: {"guide_slug": "..."}
PATCH body: {"completed_at": "...", "duration_seconds": 300, "notes": [...]}
PATCH query: ?id=<session-uuid>
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import db  # noqa: E402
from lib.cors import send_cors_headers  # noqa: E402

MAX_SLUG_LENGTH = 100


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, AttributeError):
        return False


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > 5_000:
            self.send_response(413)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Payload too large"}).encode())
            return

        body = json.loads(self.rfile.read(length)) if length else {}
        guide_slug = str(body.get("guide_slug", ""))[:MAX_SLUG_LENGTH]

        if not guide_slug:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "guide_slug is required"}, ensure_ascii=False).encode())
            return

        try:
            sb = db.admin_client()
            row = {"guide_slug": guide_slug}
            res = sb.table("sessions").insert(row).execute()
            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps(res.data[0], ensure_ascii=False).encode())
        except Exception:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}, ensure_ascii=False).encode())

    def do_PATCH(self):
        qs = parse_qs(urlparse(self.path).query)
        session_id = (qs.get("id") or [None])[0]
        if not session_id or not _is_valid_uuid(session_id):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "valid id required"}, ensure_ascii=False).encode())
            return

        length = int(self.headers.get("Content-Length", 0))
        if length > 10_000:
            self.send_response(413)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Payload too large"}).encode())
            return

        body = json.loads(self.rfile.read(length)) if length else {}
        try:
            sb = db.admin_client()
            update_data = {}
            if "completed_at" in body:
                update_data["completed_at"] = str(body["completed_at"])[:50]
            if "duration_seconds" in body:
                dur = body["duration_seconds"]
                if isinstance(dur, (int, float)) and 0 <= dur <= 86400:
                    update_data["duration_seconds"] = int(dur)
            if "notes" in body:
                notes = body["notes"]
                if isinstance(notes, list) and len(notes) <= 50:
                    update_data["notes"] = notes

            if not update_data:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "no valid fields to update"}, ensure_ascii=False).encode())
                return

            res = sb.table("sessions").update(update_data).eq("id", session_id).execute()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps(res.data[0] if res.data else {}, ensure_ascii=False).encode())
        except Exception:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self, "GET, POST, PATCH, OPTIONS")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}, ensure_ascii=False).encode())
