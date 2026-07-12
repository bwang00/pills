# AI 对话页重构 Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement conversation persistence with dual-column layout (Phase 1 of AI chat redesign)

**Architecture:** 
- Database: `conversations` and `conversation_messages` tables in Supabase
- Backend: 5 new API endpoints for conversation CRUD operations
- Frontend: Dual-column layout with conversation area (70%) and conversation list (30%)

**Tech Stack:** PostgreSQL (Supabase), Python (Vercel serverless), React + TypeScript, Tailwind CSS

## Global Constraints

- All API responses use JSON with `ensure_ascii=False`
- CORS headers via `lib.cors.send_cors_headers`
- Input validation on all endpoints (payload limits, UUID validation)
- Silent failure for message save (don't block conversation if network fails)
- Use existing `calm-*` Tailwind color palette
- Date format: "7月12日 11:05" (Chinese locale)

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/0003_conversations.sql`

**Interfaces:**
- Consumes: Supabase migration system
- Produces: `conversations` and `conversation_messages` tables

- [ ] **Step 1: Write migration SQL**

Create `supabase/migrations/0003_conversations.sql`:

```sql
-- Phase 3: Add conversation persistence for AI chat

create extension if not exists "pgcrypto";

-- Conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conversation messages table
create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_conversations_updated_at on conversations(updated_at desc);
create index if not exists idx_conversation_messages_conversation_id on conversation_messages(conversation_id);
create index if not exists idx_conversation_messages_created_at on conversation_messages(created_at);

-- Function to update conversations.updated_at when messages are added
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update conversations 
  set updated_at = now() 
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger trigger_update_conversation_timestamp
  after insert on conversation_messages
  for each row
  execute function update_conversation_timestamp();
```

- [ ] **Step 2: Apply migration to Supabase**

Run migration in Supabase dashboard or via CLI:
```bash
cd /Users/sto/pills
# If using Supabase CLI:
supabase db push
# Or manually run the SQL in Supabase dashboard SQL editor
```

- [ ] **Step 3: Verify tables created**

In Supabase dashboard, verify:
- `conversations` table exists with columns: id, created_at, updated_at
- `conversation_messages` table exists with columns: id, conversation_id, role, content, created_at
- Indexes created
- Trigger created

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_conversations.sql
git commit -m "feat: add conversations and conversation_messages tables"
```

---

### Task 2: Backend API - Create Conversation

**Files:**
- Create: `api/conversations.py`
- Create: `tests/test_api_conversations.py`

**Interfaces:**
- Consumes: `lib.db.admin_client()`, `lib.cors.send_cors_headers()`
- Produces: `POST /api/conversations` → `{ id: uuid, created_at: timestamp }`

- [ ] **Step 1: Write failing test**

Create `tests/test_api_conversations.py`:

```python
import json
from unittest.mock import MagicMock, patch
from api.conversations import handler

def make_mock_request(method, path, body=None):
    """Helper to create mock request"""
    mock_request = MagicMock()
    mock_request.method = method
    mock_request.path = path
    mock_request.body = json.dumps(body).encode() if body else b''
    mock_request.headers = {'Content-Type': 'application/json'}
    return mock_request

def test_create_conversation():
    """Test POST /api/conversations creates a new conversation"""
    mock_db = MagicMock()
    mock_conversation = {
        'id': 'test-uuid-123',
        'created_at': '2026-07-12T12:00:00Z',
        'updated_at': '2026-07-12T12:00:00Z'
    }
    mock_db.table.return_value.insert.return_value.execute.return_value.data = [mock_conversation]
    
    with patch('api.conversations.db.admin_client', return_value=mock_db):
        mock_request = make_mock_request('POST', '/api/conversations')
        response = handler(mock_request)
        
        assert response['statusCode'] == 201
        body = json.loads(response['body'])
        assert body['id'] == 'test-uuid-123'
        assert 'created_at' in body
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_create_conversation -v
```

Expected: FAIL (module not found or function not implemented)

- [ ] **Step 3: Implement POST /api/conversations**

Create `api/conversations.py`:

```python
import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from lib.db import admin_client
from lib.cors import send_cors_headers

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Create a new conversation"""
        if self.path == '/api/conversations':
            try:
                db = admin_client()
                result = db.table('conversations').insert({}).execute()
                
                if result.data:
                    conversation = result.data[0]
                    self.send_response(201)
                    self.send_header('Content-Type', 'application/json')
                    send_cors_headers(self)
                    self.end_headers()
                    self.wfile.write(json.dumps(conversation, ensure_ascii=False).encode())
                else:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    send_cors_headers(self)
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Failed to create conversation'}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        send_cors_headers(self)
        self.end_headers()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_create_conversation -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/conversations.py tests/test_api_conversations.py
git commit -m "feat: add POST /api/conversations endpoint"
```

---

### Task 3: Backend API - Save Message

**Files:**
- Modify: `api/conversations.py`
- Modify: `tests/test_api_conversations.py`

**Interfaces:**
- Consumes: conversation_id (UUID), role ('user' | 'assistant'), content (string)
- Produces: `POST /api/conversations/:id/messages` → `{ id: uuid, conversation_id: uuid, role: string, content: string, created_at: timestamp }`

- [ ] **Step 1: Write failing test**

Add to `tests/test_api_conversations.py`:

```python
def test_save_message():
    """Test POST /api/conversations/:id/messages saves a message"""
    mock_db = MagicMock()
    mock_message = {
        'id': 'msg-uuid-456',
        'conversation_id': 'conv-uuid-123',
        'role': 'user',
        'content': 'Hello',
        'created_at': '2026-07-12T12:01:00Z'
    }
    mock_db.table.return_value.insert.return_value.execute.return_value.data = [mock_message]
    
    with patch('api.conversations.db.admin_client', return_value=mock_db):
        mock_request = make_mock_request(
            'POST',
            '/api/conversations/conv-uuid-123/messages',
            {'role': 'user', 'content': 'Hello'}
        )
        response = handler(mock_request)
        
        assert response['statusCode'] == 201
        body = json.loads(response['body'])
        assert body['id'] == 'msg-uuid-456'
        assert body['role'] == 'user'
        assert body['content'] == 'Hello'

def test_save_message_invalid_role():
    """Test that invalid role is rejected"""
    mock_request = make_mock_request(
        'POST',
        '/api/conversations/conv-uuid-123/messages',
        {'role': 'invalid', 'content': 'Hello'}
    )
    response = handler(mock_request)
    assert response['statusCode'] == 400
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_save_message -v
```

Expected: FAIL

- [ ] **Step 3: Implement POST /api/conversations/:id/messages**

Modify `api/conversations.py`, add method to handler class:

```python
def do_POST(self):
    """Handle POST requests"""
    if self.path == '/api/conversations':
        # ... existing create conversation code ...
    
    elif self.path.startswith('/api/conversations/') and self.path.endswith('/messages'):
        # Extract conversation_id from path
        parts = self.path.split('/')
        if len(parts) == 4 and parts[3] == 'messages':
            conversation_id = parts[2]
            
            try:
                # Validate UUID
                import uuid
                uuid.UUID(conversation_id)
            except ValueError:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid conversation ID'}).encode())
                return
            
            # Parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))
            
            # Validate required fields
            if 'role' not in body or 'content' not in body:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Missing required fields: role, content'}).encode())
                return
            
            # Validate role
            if body['role'] not in ['user', 'assistant']:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid role. Must be user or assistant'}).encode())
                return
            
            try:
                db = admin_client()
                result = db.table('conversation_messages').insert({
                    'conversation_id': conversation_id,
                    'role': body['role'],
                    'content': body['content']
                }).execute()
                
                if result.data:
                    message = result.data[0]
                    self.send_response(201)
                    self.send_header('Content-Type', 'application/json')
                    send_cors_headers(self)
                    self.end_headers()
                    self.wfile.write(json.dumps(message, ensure_ascii=False).encode())
                else:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    send_cors_headers(self)
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Failed to save message'}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    else:
        self.send_response(404)
        self.end_headers()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_save_message tests/test_api_conversations.py::test_save_message_invalid_role -v
```

Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add api/conversations.py tests/test_api_conversations.py
git commit -m "feat: add POST /api/conversations/:id/messages endpoint"
```

---

### Task 4: Backend API - List Conversations

**Files:**
- Modify: `api/conversations.py`
- Modify: `tests/test_api_conversations.py`

**Interfaces:**
- Consumes: None (query params optional)
- Produces: `GET /api/conversations` → `[{ id, created_at, updated_at, message_count }]`

- [ ] **Step 1: Write failing test**

Add to `tests/test_api_conversations.py`:

```python
def test_list_conversations():
    """Test GET /api/conversations returns list of conversations"""
    mock_db = MagicMock()
    mock_conversations = [
        {
            'id': 'conv-1',
            'created_at': '2026-07-12T10:00:00Z',
            'updated_at': '2026-07-12T12:00:00Z',
            'message_count': 5
        },
        {
            'id': 'conv-2',
            'created_at': '2026-07-11T10:00:00Z',
            'updated_at': '2026-07-11T12:00:00Z',
            'message_count': 3
        }
    ]
    mock_db.table.return_value.select.return_value.order.return_value.execute.return_value.data = mock_conversations
    
    with patch('api.conversations.db.admin_client', return_value=mock_db):
        mock_request = make_mock_request('GET', '/api/conversations')
        response = handler(mock_request)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert len(body) == 2
        assert body[0]['id'] == 'conv-1'
        assert body[1]['id'] == 'conv-2'
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_list_conversations -v
```

Expected: FAIL

- [ ] **Step 3: Implement GET /api/conversations**

Add method to handler class in `api/conversations.py`:

```python
def do_GET(self):
    """Handle GET requests"""
    if self.path == '/api/conversations':
        try:
            db = admin_client()
            
            # Get conversations with message count
            result = db.table('conversations').select('*').order('updated_at', desc=True).execute()
            
            conversations = []
            for conv in result.data:
                # Get message count for each conversation
                msg_result = db.table('conversation_messages').select('id', count='exact').eq('conversation_id', conv['id']).execute()
                conv['message_count'] = msg_result.count
                conversations.append(conv)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps(conversations, ensure_ascii=False).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            send_cors_headers(self)
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    else:
        self.send_response(404)
        self.end_headers()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_list_conversations -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/conversations.py tests/test_api_conversations.py
git commit -m "feat: add GET /api/conversations endpoint"
```

---

### Task 5: Backend API - Get Conversation Detail

**Files:**
- Modify: `api/conversations.py`
- Modify: `tests/test_api_conversations.py`

**Interfaces:**
- Consumes: conversation_id (UUID)
- Produces: `GET /api/conversations/:id` → `{ id, created_at, updated_at, messages: [{ id, role, content, created_at }] }`

- [ ] **Step 1: Write failing test**

Add to `tests/test_api_conversations.py`:

```python
def test_get_conversation_detail():
    """Test GET /api/conversations/:id returns conversation with messages"""
    mock_db = MagicMock()
    mock_conversation = {
        'id': 'conv-uuid-123',
        'created_at': '2026-07-12T12:00:00Z',
        'updated_at': '2026-07-12T12:05:00Z'
    }
    mock_messages = [
        {
            'id': 'msg-1',
            'conversation_id': 'conv-uuid-123',
            'role': 'user',
            'content': 'Hello',
            'created_at': '2026-07-12T12:01:00Z'
        },
        {
            'id': 'msg-2',
            'conversation_id': 'conv-uuid-123',
            'role': 'assistant',
            'content': 'Hi there!',
            'created_at': '2026-07-12T12:02:00Z'
        }
    ]
    
    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = mock_conversation
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = mock_messages
    
    with patch('api.conversations.db.admin_client', return_value=mock_db):
        mock_request = make_mock_request('GET', '/api/conversations/conv-uuid-123')
        response = handler(mock_request)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['id'] == 'conv-uuid-123'
        assert len(body['messages']) == 2
        assert body['messages'][0]['role'] == 'user'
        assert body['messages'][1]['role'] == 'assistant'

def test_get_conversation_not_found():
    """Test that non-existent conversation returns 404"""
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = None
    
    with patch('api.conversations.db.admin_client', return_value=mock_db):
        mock_request = make_mock_request('GET', '/api/conversations/non-existent-uuid')
        response = handler(mock_request)
        assert response['statusCode'] == 404
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_get_conversation_detail tests/test_api_conversations.py::test_get_conversation_not_found -v
```

Expected: FAIL

- [ ] **Step 3: Implement GET /api/conversations/:id**

Add to `do_GET` method in `api/conversations.py`:

```python
def do_GET(self):
    """Handle GET requests"""
    if self.path == '/api/conversations':
        # ... existing list code ...
    
    elif self.path.startswith('/api/conversations/'):
        # Extract conversation_id from path
        parts = self.path.split('/')
        if len(parts) == 3:
            conversation_id = parts[2]
            
            try:
                # Validate UUID
                import uuid
                uuid.UUID(conversation_id)
            except ValueError:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid conversation ID'}).encode())
                return
            
            try:
                db = admin_client()
                
                # Get conversation
                conv_result = db.table('conversations').select('*').eq('id', conversation_id).single().execute()
                
                if not conv_result.data:
                    self.send_response(404)
                    self.send_header('Content-Type', 'application/json')
                    send_cors_headers(self)
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Conversation not found'}).encode())
                    return
                
                conversation = conv_result.data
                
                # Get messages
                msg_result = db.table('conversation_messages').select('*').eq('conversation_id', conversation_id).order('created_at').execute()
                conversation['messages'] = msg_result.data
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps(conversation, ensure_ascii=False).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    else:
        self.send_response(404)
        self.end_headers()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_get_conversation_detail tests/test_api_conversations.py::test_get_conversation_not_found -v
```

Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add api/conversations.py tests/test_api_conversations.py
git commit -m "feat: add GET /api/conversations/:id endpoint"
```

---

### Task 6: Backend API - Delete Conversation

**Files:**
- Modify: `api/conversations.py`
- Modify: `tests/test_api_conversations.py`

**Interfaces:**
- Consumes: conversation_id (UUID)
- Produces: `DELETE /api/conversations/:id` → 204 No Content

- [ ] **Step 1: Write failing test**

Add to `tests/test_api_conversations.py`:

```python
def test_delete_conversation():
    """Test DELETE /api/conversations/:id deletes conversation"""
    mock_db = MagicMock()
    mock_db.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [{'id': 'conv-uuid-123'}]
    
    with patch('api.conversations.db.admin_client', return_value=mock_db):
        mock_request = make_mock_request('DELETE', '/api/conversations/conv-uuid-123')
        response = handler(mock_request)
        
        assert response['statusCode'] == 204

def test_delete_conversation_invalid_id():
    """Test that invalid UUID returns 400"""
    mock_request = make_mock_request('DELETE', '/api/conversations/invalid-uuid')
    response = handler(mock_request)
    assert response['statusCode'] == 400
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_delete_conversation tests/test_api_conversations.py::test_delete_conversation_invalid_id -v
```

Expected: FAIL

- [ ] **Step 3: Implement DELETE /api/conversations/:id**

Add method to handler class in `api/conversations.py`:

```python
def do_DELETE(self):
    """Handle DELETE requests"""
    if self.path.startswith('/api/conversations/'):
        parts = self.path.split('/')
        if len(parts) == 3:
            conversation_id = parts[2]
            
            try:
                # Validate UUID
                import uuid
                uuid.UUID(conversation_id)
            except ValueError:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Invalid conversation ID'}).encode())
                return
            
            try:
                db = admin_client()
                db.table('conversations').delete().eq('id', conversation_id).execute()
                
                self.send_response(204)
                send_cors_headers(self)
                self.end_headers()
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                send_cors_headers(self)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    else:
        self.send_response(404)
        self.end_headers()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/sto/pills
python -m pytest tests/test_api_conversations.py::test_delete_conversation tests/test_api_conversations.py::test_delete_conversation_invalid_id -v
```

Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add api/conversations.py tests/test_api_conversations.py
git commit -m "feat: add DELETE /api/conversations/:id endpoint"
```

---

### Task 7: Frontend - Dual-Column Layout Skeleton

**Files:**
- Modify: `frontend/src/pages/AIChatPage.tsx`
- Create: `frontend/src/components/ConversationList.tsx`

**Interfaces:**
- Consumes: None
- Produces: Dual-column layout with left (70%) conversation area and right (30%) conversation list

- [ ] **Step 1: Create ConversationList component**

Create `frontend/src/components/ConversationList.tsx`:

```tsx
import { useEffect, useState } from 'react';

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  selectedConversationId: string | null;
}

export default function ConversationList({ 
  onSelectConversation, 
  onNewConversation,
  selectedConversationId 
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个对话吗？')) return;
    
    try {
      await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
      setConversations(conversations.filter(c => c.id !== conversationId));
      if (selectedConversationId === conversationId) {
        onNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-calm-200">
      <div className="p-4 border-b border-calm-200">
        <button
          onClick={onNewConversation}
          className="w-full px-4 py-2 bg-calm-500 text-white rounded-lg hover:bg-calm-600 transition-colors"
        >
          新对话
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-calm-400">加载中...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-calm-400">暂无对话记录</div>
        ) : (
          <div className="divide-y divide-calm-100">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-4 cursor-pointer hover:bg-calm-50 transition-colors ${
                  selectedConversationId === conv.id ? 'bg-calm-100' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-calm-600">
                    {formatDate(conv.updated_at)}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="text-calm-400 hover:text-red-500 text-sm"
                  >
                    删除
                  </button>
                </div>
                <div className="text-xs text-calm-500">
                  {conv.message_count} 条消息
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update AIChatPage to use dual-column layout**

Modify `frontend/src/pages/AIChatPage.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import ConversationList from '../components/ConversationList';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '嘿，最近怎么样？想聊点什么吗？' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleVoiceResult = (text: string) => {
    if (text.trim()) {
      setInput(text.trim());
    }
  };
  const { isListening, transcript, error: voiceError, startListening, stopListening, supported } = useVoiceInput(handleVoiceResult);

  useEffect(() => {
    if (isListening && transcript) setInput(transcript);
  }, [isListening, transcript]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([
      { role: 'assistant', content: '嘿，最近怎么样？想聊点什么吗？' },
    ]);
  };

  const handleSelectConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      const data = await response.json();
      setConversationId(id);
      setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Create conversation if needed
    let currentConvId = conversationId;
    if (!currentConvId) {
      try {
        const response = await fetch('/api/conversations', { method: 'POST' });
        const data = await response.json();
        currentConvId = data.id;
        setConversationId(currentConvId);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    }

    // Save user message
    if (currentConvId) {
      try {
        await fetch(`/api/conversations/${currentConvId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: userMsg.content }),
        });
      } catch (error) {
        console.error('Failed to save user message:', error);
      }
    }

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, history: newMessages.slice(0, -1) }),
      });
      const data = await res.json();
      const replyContent = data.reply || '';
      const assistantMsg: Message = { role: 'assistant', content: replyContent };
      setMessages([...newMessages, assistantMsg]);

      // Save assistant message
      if (currentConvId) {
        try {
          await fetch(`/api/conversations/${currentConvId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'assistant', content: replyContent }),
          });
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '抱歉，我这边暂时有点问题。你能再说一次吗？' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="聊天">
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left: Conversation Area (70%) */}
        <div className="w-7/10 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 py-4 px-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-calm-500 text-white rounded-br-sm'
                    : 'bg-white border border-calm-100 text-calm-800 rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-calm-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-calm-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-calm-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-calm-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {voiceError && (
            <div className="text-center text-red-400 text-xs py-1">{voiceError}</div>
          )}

          <div className="flex gap-2 pt-2 pb-4 px-4 border-t border-calm-100 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={isListening ? '正在听你说…' : '想聊点什么？'}
              className="flex-1 rounded-full border border-calm-200 px-4 py-3 text-calm-800 placeholder:text-calm-300 focus:outline-none focus:border-calm-400 transition-colors"
              disabled={loading || isListening}
            />
            {supported && (
              <button
                onClick={() => isListening ? stopListening() : startListening()}
                disabled={loading}
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isListening ? 'bg-red-500 text-white scale-110' : 'bg-calm-100 text-calm-500'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            )}
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-full bg-calm-500 text-white px-6 py-3 font-semibold hover:bg-calm-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              发送
            </button>
          </div>
        </div>

        {/* Right: Conversation List (30%) */}
        <div className="w-3/10">
          <ConversationList
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            selectedConversationId={conversationId}
          />
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/sto/pills/frontend
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AIChatPage.tsx frontend/src/components/ConversationList.tsx
git commit -m "feat: add dual-column layout with conversation list"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run all backend tests**

```bash
cd /Users/sto/pills
python -m pytest tests/ -v
```

Expected: All tests pass

- [ ] **Step 2: Run all frontend tests**

```bash
cd /Users/sto/pills/frontend
npm test
```

Expected: All tests pass (pre-existing grounding test failures are unrelated)

- [ ] **Step 3: Build frontend**

```bash
cd /Users/sto/pills/frontend
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Push to GitHub**

```bash
cd /Users/sto/pills
git push origin main
```

- [ ] **Step 5: Tag release**

```bash
git tag -f 0712
git push origin 0712 -f
```
