"""Tests for GET /api/guides."""
import json, os
from io import BytesIO
from unittest.mock import MagicMock, patch

from api.guides import handler

class FakeResponse:
    def __init__(self, data): self.data = data

def make_mock_client(guides_data):
    mock_sb = MagicMock()
    chain = MagicMock()
    mock_sb.table.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.order.return_value = chain
    chain.execute.return_value = FakeResponse(guides_data)
    return mock_sb

def _extract_body(wfile):
    raw = wfile.getvalue().decode()
    body = raw.split("\r\n\r\n", 1)[1] if "\r\n\r\n" in raw else raw
    return json.loads(body)

def _call_handler(mock_sb, path="/api/guides"):
    with patch("api.guides.db.admin_client", return_value=mock_sb):
        h = handler.__new__(handler)
        h.path = path
        h.command = "GET"
        h.headers = {}
        h.requestline = "GET /api/guides HTTP/1.1"
        h.request_version = "HTTP/1.1"
        h.close_connection = True
        h._headers_buffer = []
        h.wfile = BytesIO()
        h.client_address = ("127.0.0.1", 8080)
        h.server = MagicMock()
        h.do_GET()
        return _extract_body(h.wfile)

def test_list_all_guides():
    sample = [{"id": "1", "slug": "breathing-478", "title": "4-7-8"}]
    result = _call_handler(make_mock_client(sample))
    assert len(result) == 1
    assert result[0]["slug"] == "breathing-478"

def test_filter_by_slug():
    sample = [{"id": "1", "slug": "breathing-478", "title": "4-7-8"}]
    result = _call_handler(make_mock_client(sample), "/api/guides?slug=breathing-478")
    assert len(result) == 1
