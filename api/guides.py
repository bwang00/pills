"""GET /api/guides — list or filter guide configurations.

Query params:
  slug      Optional. Filter by guide slug.
  category  Optional. Filter by category ("breathing" | "grounding").
"""
from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import db  # noqa: E402
from lib.cors import send_cors_headers  # noqa: E402

VALID_CATEGORIES = {"breathing", "grounding", "muscle_relax", "mindfulness"}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        slug = (qs.get("slug") or [None])[0]
        category = (qs.get("category") or [None])[0]

        # Validate category
        if category and category not in VALID_CATEGORIES:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"invalid category, must be one of: {', '.join(sorted(VALID_CATEGORIES))}"
            }, ensure_ascii=False).encode())
            return

        try:
            sb = db.admin_client()
            q = sb.table("guides").select("*").eq("active", True).order("sort_order")
            if slug:
                q = q.eq("slug", slug[:100])
            if category:
                q = q.eq("category", category)
            rows = q.execute()
            data = rows.data or []

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode())
        except Exception:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}, ensure_ascii=False).encode())
