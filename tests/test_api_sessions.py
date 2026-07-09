"""Tests for POST/PATCH /api/sessions."""
import json, os
from io import BytesIO
from unittest.mock import MagicMock, patch

from api.sessions import handler

class FakeResponse:
    def __init__(self, data): self.data = data

def make_mock_client(ret=None):
    mock_sb = MagicMock()
    chain = MagicMock()
    mock_sb.table.return_value = chain
    chain.insert.return_value = chain
    chain.update.return_value = chain
    chain.eq.return_value = chain
    chain.execute.return_value = FakeResponse(ret or [{"id": "test-uuid"}])
    return mock_sb

def _extract_body(wfile):
    raw = wfile.getvalue().decode()
    body = raw.split("\r\n\r\n", 1)[1] if "\r\n\r\n" in raw else raw
    return json.loads(body)

def _call_handler(mock_sb, method, path, body=None):
    with patch("api.sessions.db.admin_client", return_value=mock_sb):
        h = handler.__new__(handler)
        h.path = path
        h.command = method
        h.requestline = f"{method} {path} HTTP/1.1"
        h.request_version = "HTTP/1.1"
        h.close_connection = True
        h._headers_buffer = []
        h.wfile = BytesIO()
        h.client_address = ("127.0.0.1", 8080)
        h.server = MagicMock()
        if body:
            encoded = json.dumps(body).encode()
            h.headers = {"Content-Length": str(len(encoded))}
            h.rfile = BytesIO(encoded)
        else:
            h.headers = {"Content-Length": "0"}
            h.rfile = BytesIO()
        if method == "POST": h.do_POST()
        elif method == "PATCH": h.do_PATCH()
        return _extract_body(h.wfile)

def test_create_session():
    result = _call_handler(make_mock_client([{"id": "abc-123"}]), "POST", "/api/sessions", {"guide_slug": "breathing-478"})
    assert result["id"] == "abc-123"

def test_update_session():
    result = _call_handler(make_mock_client([{"id": "abc-123"}]), "PATCH", "/api/sessions?id=abc-123", {"completed_at": "2026-01-01T00:05:00Z", "duration_seconds": 300, "notes": []})
    assert result["id"] == "abc-123"
