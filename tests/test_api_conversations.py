"""Tests for conversations API endpoints."""
import json
from io import BytesIO
from unittest.mock import MagicMock, patch

from api.conversations import handler


class FakeResponse:
    """Mock Supabase response."""
    def __init__(self, data=None, count=None):
        self.data = data
        self.count = count


def make_mock_client(ret=None, count=None):
    """Create a mock Supabase client."""
    mock_sb = MagicMock()
    chain = MagicMock()
    mock_sb.table.return_value = chain
    chain.insert.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.order.return_value = chain
    chain.single.return_value = chain
    chain.delete.return_value = chain
    chain.execute.return_value = FakeResponse(ret, count)
    return mock_sb


def _extract_body(wfile):
    """Extract JSON body from response."""
    raw = wfile.getvalue().decode()
    body = raw.split("\r\n\r\n", 1)[1] if "\r\n\r\n" in raw else raw
    return json.loads(body)


def _get_status_code(wfile):
    """Extract status code from response."""
    raw = wfile.getvalue().decode()
    status_line = raw.split("\r\n")[0]
    return int(status_line.split(" ")[1])


def _call_handler(mock_sb, method, path, body=None):
    """Call handler with mocked client."""
    with patch("api.conversations.db.admin_client", return_value=mock_sb):
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
        
        if method == "POST":
            h.do_POST()
        elif method == "GET":
            h.do_GET()
        elif method == "DELETE":
            h.do_DELETE()
        
        status = _get_status_code(h.wfile)
        # 204 No Content has no body
        if status == 204:
            return None, status
        return _extract_body(h.wfile), status


# =============================================================================
# POST /api/conversations - Create Conversation
# =============================================================================

def test_create_conversation():
    """Test POST /api/conversations creates a new conversation."""
    mock_conversation = {
        "id": "test-uuid-123",
        "created_at": "2026-07-12T12:00:00Z",
        "updated_at": "2026-07-12T12:00:00Z"
    }
    mock_sb = make_mock_client([mock_conversation])
    
    body, status = _call_handler(mock_sb, "POST", "/api/conversations")
    
    assert status == 201
    assert body["id"] == "test-uuid-123"
    assert "created_at" in body
    assert "updated_at" in body


def test_create_conversation_error():
    """Test POST /api/conversations returns 500 on error."""
    mock_sb = make_mock_client(None)
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = None
    
    body, status = _call_handler(mock_sb, "POST", "/api/conversations")
    
    assert status == 500
    assert "error" in body


# =============================================================================
# POST /api/conversations/:id/messages - Save Message
# =============================================================================

def test_save_message():
    """Test POST /api/conversations/:id/messages saves a message."""
    conv_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    mock_message = {
        "id": "msg-uuid-456",
        "conversation_id": conv_id,
        "role": "user",
        "content": "Hello",
        "created_at": "2026-07-12T12:01:00Z"
    }
    mock_sb = make_mock_client([mock_message])
    
    body, status = _call_handler(
        mock_sb,
        "POST",
        f"/api/conversations/{conv_id}/messages",
        {"role": "user", "content": "Hello"}
    )
    
    assert status == 201
    assert body["id"] == "msg-uuid-456"
    assert body["role"] == "user"
    assert body["content"] == "Hello"


def test_save_message_assistant_role():
    """Test POST /api/conversations/:id/messages with assistant role."""
    conv_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    mock_message = {
        "id": "msg-uuid-789",
        "conversation_id": conv_id,
        "role": "assistant",
        "content": "Hi there!",
        "created_at": "2026-07-12T12:02:00Z"
    }
    mock_sb = make_mock_client([mock_message])
    
    body, status = _call_handler(
        mock_sb,
        "POST",
        f"/api/conversations/{conv_id}/messages",
        {"role": "assistant", "content": "Hi there!"}
    )
    
    assert status == 201
    assert body["role"] == "assistant"


def test_save_message_invalid_role():
    """Test that invalid role is rejected."""
    mock_sb = make_mock_client()
    conv_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    
    body, status = _call_handler(
        mock_sb,
        "POST",
        f"/api/conversations/{conv_id}/messages",
        {"role": "invalid", "content": "Hello"}
    )
    
    assert status == 400
    assert "error" in body


def test_save_message_missing_fields():
    """Test that missing required fields are rejected."""
    mock_sb = make_mock_client()
    conv_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    
    body, status = _call_handler(
        mock_sb,
        "POST",
        f"/api/conversations/{conv_id}/messages",
        {"role": "user"}  # missing content
    )
    
    assert status == 400
    assert "error" in body


def test_save_message_invalid_uuid():
    """Test that invalid UUID returns 400."""
    mock_sb = make_mock_client()
    
    body, status = _call_handler(
        mock_sb,
        "POST",
        "/api/conversations/invalid-uuid/messages",
        {"role": "user", "content": "Hello"}
    )
    
    assert status == 400
    assert "error" in body


# =============================================================================
# GET /api/conversations - List Conversations
# =============================================================================

def test_list_conversations():
    """Test GET /api/conversations returns list of conversations."""
    mock_conversations = [
        {
            "id": "conv-1",
            "created_at": "2026-07-12T10:00:00Z",
            "updated_at": "2026-07-12T12:00:00Z"
        },
        {
            "id": "conv-2",
            "created_at": "2026-07-11T10:00:00Z",
            "updated_at": "2026-07-11T12:00:00Z"
        }
    ]
    
    mock_sb = MagicMock()
    
    # Setup conversations query chain
    conv_chain = MagicMock()
    conv_chain.select.return_value = conv_chain
    conv_chain.order.return_value = conv_chain
    conv_chain.execute.return_value = FakeResponse(mock_conversations)
    
    # Setup message count query chain (separate for each conversation)
    msg_chain1 = MagicMock()
    msg_chain1.select.return_value = msg_chain1
    msg_chain1.eq.return_value = msg_chain1
    msg_chain1.execute.return_value = FakeResponse([], count=5)
    
    msg_chain2 = MagicMock()
    msg_chain2.select.return_value = msg_chain2
    msg_chain2.eq.return_value = msg_chain2
    msg_chain2.execute.return_value = FakeResponse([], count=3)
    
    # Configure table() to return appropriate chains
    def table_side_effect(table_name):
        if table_name == "conversations":
            return conv_chain
        elif table_name == "conversation_messages":
            # Return different chains for message count queries
            return MagicMock(select=MagicMock(return_value=MagicMock(eq=MagicMock(return_value=MagicMock(execute=MagicMock(return_value=FakeResponse([], count=5)))))))
        return conv_chain
    
    mock_sb.table.side_effect = table_side_effect
    
    body, status = _call_handler(mock_sb, "GET", "/api/conversations")
    
    assert status == 200
    assert isinstance(body, list)


def test_list_conversations_empty():
    """Test GET /api/conversations returns empty list when no conversations."""
    mock_sb = MagicMock()
    
    conv_chain = MagicMock()
    conv_chain.select.return_value = conv_chain
    conv_chain.order.return_value = conv_chain
    conv_chain.execute.return_value = FakeResponse([])
    
    mock_sb.table.return_value = conv_chain
    
    body, status = _call_handler(mock_sb, "GET", "/api/conversations")
    
    assert status == 200
    assert body == []


# =============================================================================
# GET /api/conversations/:id - Get Conversation Detail
# =============================================================================

def test_get_conversation_detail():
    """Test GET /api/conversations/:id returns conversation with messages."""
    conv_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    mock_conversation = {
        "id": conv_id,
        "created_at": "2026-07-12T12:00:00Z",
        "updated_at": "2026-07-12T12:05:00Z"
    }
    mock_messages = [
        {
            "id": "msg-1",
            "conversation_id": conv_id,
            "role": "user",
            "content": "Hello",
            "created_at": "2026-07-12T12:01:00Z"
        },
        {
            "id": "msg-2",
            "conversation_id": conv_id,
            "role": "assistant",
            "content": "Hi there!",
            "created_at": "2026-07-12T12:02:00Z"
        }
    ]
    
    mock_sb = MagicMock()
    
    # Setup conversation fetch
    conv_chain = MagicMock()
    conv_chain.select.return_value = conv_chain
    conv_chain.eq.return_value = conv_chain
    conv_chain.single.return_value = conv_chain
    conv_chain.execute.return_value = FakeResponse(mock_conversation)
    
    # Setup messages fetch
    msg_chain = MagicMock()
    msg_chain.select.return_value = msg_chain
    msg_chain.eq.return_value = msg_chain
    msg_chain.order.return_value = msg_chain
    msg_chain.execute.return_value = FakeResponse(mock_messages)
    
    mock_sb.table.side_effect = lambda table_name: conv_chain if table_name == "conversations" else msg_chain
    
    body, status = _call_handler(mock_sb, "GET", f"/api/conversations/{conv_id}")
    
    assert status == 200
    assert body["id"] == conv_id
    assert "messages" in body
    assert len(body["messages"]) == 2
    assert body["messages"][0]["role"] == "user"
    assert body["messages"][1]["role"] == "assistant"


def test_get_conversation_not_found():
    """Test that non-existent conversation returns 404."""
    conv_id = "00000000-0000-0000-0000-000000000000"
    mock_sb = MagicMock()
    
    conv_chain = MagicMock()
    conv_chain.select.return_value = conv_chain
    conv_chain.eq.return_value = conv_chain
    conv_chain.single.return_value = conv_chain
    conv_chain.execute.return_value = FakeResponse(None)
    
    mock_sb.table.return_value = conv_chain
    
    body, status = _call_handler(mock_sb, "GET", f"/api/conversations/{conv_id}")
    
    assert status == 404
    assert "error" in body


def test_get_conversation_invalid_uuid():
    """Test that invalid UUID returns 400."""
    mock_sb = make_mock_client()
    
    body, status = _call_handler(mock_sb, "GET", "/api/conversations/invalid-uuid")
    
    assert status == 400
    assert "error" in body


# =============================================================================
# DELETE /api/conversations/:id - Delete Conversation
# =============================================================================

def test_delete_conversation():
    """Test DELETE /api/conversations/:id deletes conversation."""
    conv_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    mock_sb = make_mock_client([{"id": conv_id}])
    
    body, status = _call_handler(mock_sb, "DELETE", f"/api/conversations/{conv_id}")
    
    assert status == 204
    assert body is None


def test_delete_conversation_invalid_uuid():
    """Test that invalid UUID returns 400."""
    mock_sb = make_mock_client()
    
    body, status = _call_handler(mock_sb, "DELETE", "/api/conversations/invalid-uuid")
    
    assert status == 400
    assert "error" in body


# =============================================================================
# OPTIONS - CORS Preflight
# =============================================================================

def test_options_preflight():
    """Test OPTIONS request for CORS preflight."""
    mock_sb = make_mock_client()
    
    with patch("api.conversations.db.admin_client", return_value=mock_sb):
        h = handler.__new__(handler)
        h.path = "/api/conversations"
        h.command = "OPTIONS"
        h.requestline = "OPTIONS /api/conversations HTTP/1.1"
        h.request_version = "HTTP/1.1"
        h.close_connection = True
        h._headers_buffer = []
        h.wfile = BytesIO()
        h.client_address = ("127.0.0.1", 8080)
        h.server = MagicMock()
        h.headers = {"Content-Length": "0"}
        h.rfile = BytesIO()
        
        h.do_OPTIONS()
        
        raw = h.wfile.getvalue().decode()
        status_line = raw.split("\r\n")[0]
        status = int(status_line.split(" ")[1])
        
        assert status == 200


# =============================================================================
# POST /api/conversations/:id/extract-tags - Extract Tags
# =============================================================================

def test_extract_tags():
    """Test POST /api/conversations/:id/extract-tags extracts and saves tags."""
    conv_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    mock_messages = [
        {"id": "msg-1", "conversation_id": conv_id, "role": "user", "content": "工作压力好大", "created_at": "2026-07-12T12:01:00Z"},
        {"id": "msg-2", "conversation_id": conv_id, "role": "assistant", "content": "理解你的感受", "created_at": "2026-07-12T12:02:00Z"}
    ]
    
    mock_sb = MagicMock()
    
    # Setup messages fetch
    msg_chain = MagicMock()
    msg_chain.select.return_value = msg_chain
    msg_chain.eq.return_value = msg_chain
    msg_chain.order.return_value = msg_chain
    msg_chain.execute.return_value = FakeResponse(mock_messages)
    
    # Setup tag delete
    delete_chain = MagicMock()
    delete_chain.delete.return_value = delete_chain
    delete_chain.eq.return_value = delete_chain
    delete_chain.execute.return_value = FakeResponse([])
    
    # Setup tag insert
    insert_chain = MagicMock()
    insert_chain.insert.return_value = insert_chain
    insert_chain.execute.return_value = FakeResponse([{"id": "tag-1", "conversation_id": conv_id, "tag": "工作压力"}])
    
    def table_side_effect(table_name):
        if table_name == "conversation_messages":
            return msg_chain
        elif table_name == "conversation_tags":
            return delete_chain
        return MagicMock()
    
    mock_sb.table.side_effect = table_side_effect
    
    with patch("api.conversations.call_qwen", return_value='["工作压力", "心理健康"]'):
        with patch("api.conversations.db.admin_client", return_value=mock_sb):
            h = handler.__new__(handler)
            h.path = f"/api/conversations/{conv_id}/extract-tags"
            h.command = "POST"
            h.requestline = f"POST /api/conversations/{conv_id}/extract-tags HTTP/1.1"
            h.request_version = "HTTP/1.1"
            h.close_connection = True
            h._headers_buffer = []
            h.wfile = BytesIO()
            h.client_address = ("127.0.0.1", 8080)
            h.server = MagicMock()
            h.headers = {"Content-Length": "0"}
            h.rfile = BytesIO()
            
            h.do_POST()
            
            body, status = _extract_body(h.wfile), _get_status_code(h.wfile)
            
            assert status == 200
            assert "tags" in body
            assert body["tags"] == ["工作压力", "心理健康"]


def test_extract_tags_empty_messages():
    """Test POST /api/conversations/:id/extract-tags with no messages."""
    conv_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    
    mock_sb = MagicMock()
    msg_chain = MagicMock()
    msg_chain.select.return_value = msg_chain
    msg_chain.eq.return_value = msg_chain
    msg_chain.order.return_value = msg_chain
    msg_chain.execute.return_value = FakeResponse([])
    
    mock_sb.table.return_value = msg_chain
    
    with patch("api.conversations.db.admin_client", return_value=mock_sb):
        body, status = _call_handler(mock_sb, "POST", f"/api/conversations/{conv_id}/extract-tags")
        
        assert status == 200
        assert body["tags"] == []


def test_extract_tags_invalid_uuid():
    """Test POST /api/conversations/:id/extract-tags with invalid UUID."""
    mock_sb = make_mock_client()
    
    body, status = _call_handler(mock_sb, "POST", "/api/conversations/invalid-uuid/extract-tags")
    
    assert status == 400
    assert "error" in body


# =============================================================================
# GET /api/tags - Get Aggregated Tags
# =============================================================================

def test_get_tags():
    """Test GET /api/tags returns aggregated tags sorted by count."""
    mock_tags = [
        {"tag": "工作压力"},
        {"tag": "工作压力"},
        {"tag": "人际关系"},
        {"tag": "焦虑情绪"},
        {"tag": "焦虑情绪"},
        {"tag": "焦虑情绪"}
    ]
    
    mock_sb = MagicMock()
    tag_chain = MagicMock()
    tag_chain.select.return_value = tag_chain
    tag_chain.execute.return_value = FakeResponse(mock_tags)
    
    mock_sb.table.return_value = tag_chain
    
    body, status = _call_handler(mock_sb, "GET", "/api/tags")
    
    assert status == 200
    assert isinstance(body, list)
    assert len(body) == 3
    assert body[0]["tag"] == "焦虑情绪"
    assert body[0]["count"] == 3
    assert body[1]["tag"] == "工作压力"
    assert body[1]["count"] == 2
    assert body[2]["tag"] == "人际关系"
    assert body[2]["count"] == 1


def test_get_tags_empty():
    """Test GET /api/tags returns empty list when no tags."""
    mock_sb = MagicMock()
    tag_chain = MagicMock()
    tag_chain.select.return_value = tag_chain
    tag_chain.execute.return_value = FakeResponse([])
    
    mock_sb.table.return_value = tag_chain
    
    body, status = _call_handler(mock_sb, "GET", "/api/tags")
    
    assert status == 200
    assert body == []


# =============================================================================
# GET /api/conversations?tag=xxx - Filter by Tag
# =============================================================================

def test_list_conversations_with_tag_filter():
    """Test GET /api/conversations?tag=xxx filters by tag."""
    mock_tag_result = [
        {"conversation_id": "conv-1"},
        {"conversation_id": "conv-3"}
    ]
    
    mock_conversations = [
        {"id": "conv-1", "created_at": "2026-07-12T10:00:00Z", "updated_at": "2026-07-12T12:00:00Z"},
        {"id": "conv-2", "created_at": "2026-07-11T10:00:00Z", "updated_at": "2026-07-11T12:00:00Z"},
        {"id": "conv-3", "created_at": "2026-07-10T10:00:00Z", "updated_at": "2026-07-10T12:00:00Z"}
    ]
    
    mock_sb = MagicMock()
    
    # Setup tag query
    tag_chain = MagicMock()
    tag_chain.select.return_value = tag_chain
    tag_chain.eq.return_value = tag_chain
    tag_chain.execute.return_value = FakeResponse(mock_tag_result)
    
    # Setup conversations query
    conv_chain = MagicMock()
    conv_chain.select.return_value = conv_chain
    conv_chain.order.return_value = conv_chain
    conv_chain.execute.return_value = FakeResponse(mock_conversations)
    
    # Setup message count
    msg_chain = MagicMock()
    msg_chain.select.return_value = msg_chain
    msg_chain.eq.return_value = msg_chain
    msg_chain.execute.return_value = FakeResponse([], count=5)
    
    def table_side_effect(table_name):
        if table_name == "conversation_tags":
            return tag_chain
        elif table_name == "conversations":
            return conv_chain
        elif table_name == "conversation_messages":
            return msg_chain
        return MagicMock()
    
    mock_sb.table.side_effect = table_side_effect
    
    body, status = _call_handler(mock_sb, "GET", "/api/conversations?tag=工作压力")
    
    assert status == 200
    assert isinstance(body, list)
    # Should only include conv-1 and conv-3
    assert len(body) == 2
    assert body[0]["id"] == "conv-1"
    assert body[1]["id"] == "conv-3"


def test_list_conversations_with_tag_no_matches():
    """Test GET /api/conversations?tag=xxx returns empty when no matches."""
    mock_sb = MagicMock()
    tag_chain = MagicMock()
    tag_chain.select.return_value = tag_chain
    tag_chain.eq.return_value = tag_chain
    tag_chain.execute.return_value = FakeResponse([])
    
    mock_sb.table.return_value = tag_chain
    
    body, status = _call_handler(mock_sb, "GET", "/api/conversations?tag=nonexistent")
    
    assert status == 200
    assert body == []
