"""GET /api/health — health check endpoint."""
from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib.cors import send_cors_headers  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        send_cors_headers(self, "GET, OPTIONS")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ok"}).encode())
