"""POST /api/sessions — create session; PATCH — complete session.

POST body: {"guide_slug": "..."}
PATCH body: {"completed_at": "...", "duration_seconds": 300, "notes": [...]}
PATCH query: ?id=<session-uuid>
"""
from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import db  # noqa: E402


def _cors_headers(h: BaseHTTPRequestHandler):
    h.send_header("Access-Control-Allow-Origin", "*")
    h.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        _cors_headers(self)
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        try:
            sb = db.admin_client()
            row = {"guide_slug": body.get("guide_slug", "")}
            res = sb.table("sessions").insert(row).execute()
            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps(res.data[0], ensure_ascii=False).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode())

    def do_PATCH(self):
        qs = parse_qs(urlparse(self.path).query)
        session_id = (qs.get("id") or [None])[0]
        if not session_id:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "id required"}, ensure_ascii=False).encode())
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        try:
            sb = db.admin_client()
            update_data = {}
            if "completed_at" in body:
                update_data["completed_at"] = body["completed_at"]
            if "duration_seconds" in body:
                update_data["duration_seconds"] = body["duration_seconds"]
            if "notes" in body:
                update_data["notes"] = body["notes"]
            res = sb.table("sessions").update(update_data).eq("id", session_id).execute()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps(res.data[0] if res.data else {}, ensure_ascii=False).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            _cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode())
