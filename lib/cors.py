"""CORS helpers with domain allowlist."""
from __future__ import annotations

import os
from http.server import BaseHTTPRequestHandler

# Allowed origins — set ALLOWED_ORIGINS env var (comma-separated) or default to your domain
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "https://pills.vercel.app,https://pills-wang.vercel.app,http://localhost:5173"
).split(",")


def get_allowed_origin(h: BaseHTTPRequestHandler) -> str | None:
    """Return the Origin header if it's in the allowlist, else None."""
    origin = h.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:
        return origin
    # For development, also allow localhost with any port
    if origin.startswith("http://localhost:"):
        return origin
    return None


def send_cors_headers(h: BaseHTTPRequestHandler, methods: str = "GET, POST, PATCH, OPTIONS"):
    """Send CORS headers with proper origin validation."""
    allowed = get_allowed_origin(h)
    if allowed:
        h.send_header("Access-Control-Allow-Origin", allowed)
        h.send_header("Access-Control-Allow-Methods", methods)
        h.send_header("Access-Control-Allow-Headers", "Content-Type")
        h.send_header("Vary", "Origin")
