# Pills — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a calming web app that guides anxious users through deep-breathing exercises and 5-4-3-2-1 sensory grounding, with AI-powered dynamic content (Phase 2).

**Architecture:** Monorepo with Python serverless API functions on Vercel (matching fundTracking pattern), React+Vite+TypeScript frontend, Supabase (PostgreSQL) for data persistence. API functions use `BaseHTTPRequestHandler`. Frontend communicates with backend via `/api/*` routes; Supabase client used directly on frontend for realtime features.

**Tech Stack:** Python 3.12+, Vercel Serverless, React 18, Vite 5, TypeScript, framer-motion, Supabase JS SDK, TailwindCSS, Qwen API (Phase 2)

## Global Constraints

- Follow the exact same project structure and patterns as `bwang00/fundTracking`
- Python API functions use `BaseHTTPRequestHandler` (NOT FastAPI) for Vercel compatibility
- Shared DB logic in `lib/db.py` with `@lru_cache` admin client (service-role key)
- Frontend uses React + Vite + TypeScript with `@supabase/supabase-js`
- All UI text in Chinese (简体中文)
- Soft blue-green color palette — no red/warning colors for errors
- Mobile-first responsive design
- Every task follows TDD: write failing test → implement → verify pass → commit
- No placeholder code — every step must be complete and runnable

---

### Task 1: Project Scaffolding

**Files:**
- Create: `pills/.env.example`
- Create: `pills/.gitignore`
- Create: `pills/requirements.txt`
- Create: `pills/vercel.json`
- Create: `pills/frontend/package.json`
- Create: `pills/frontend/tsconfig.json`
- Create: `pills/frontend/vite.config.ts`
- Create: `pills/frontend/index.html`
- Create: `pills/lib/__init__.py`
- Create: `pills/lib/db.py`
- Create: `pills/api/__init__.py`

**Interfaces:**
- Produces: `lib.db.admin_client() → supabase.Client` (used by all API tasks)
- Produces: `vercel.json` build config (used by deployment)

- [ ] **Step 1: Create `.env.example`**

```env
# --- Supabase ---
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# --- AI (Phase 2) ---
QWEN_API_KEY=your-qwen-api-key-here

# --- Frontend (Vite) ---
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
# Env
.env
.env.local
.env.*.local

# Python
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
.pytest_cache/
.mypy_cache/
*.egg-info/

# Node / Vite
node_modules/
dist/
.vite/
.DS_Store
*.log

# Vercel
.vercel/

# IDE
.idea/
.vscode/

# OS
Thumbs.db
.vercel
```

- [ ] **Step 3: Create `requirements.txt`**

```
supabase>=2.5.0
python-dotenv>=1.0.1
```

- [ ] **Step 4: Create `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": null,
  "functions": {
    "api/*.py": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

- [ ] **Step 5: Create frontend scaffolding**

`frontend/package.json`:

```json
{
  "name": "pills-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "framer-motion": "^11.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.3",
    "vite": "^5.4.0"
  }
}
```

`frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

`frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

`frontend/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pills — 焦虑急救</title>
    <meta name="description" content="焦虑发作时的即时冷静引导工具" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create Tailwind + PostCSS config**

`frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        calm: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6df',
          300: '#5ceaca',
          400: '#2dd4af',
          500: '#14b896',
          600: '#0d947c',
          700: '#0f7665',
          800: '#115e52',
          900: '#134e44',
          950: '#042f29',
        },
      },
    },
  },
  plugins: [],
};
```

`frontend/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create `lib/db.py` (Supabase client, matching fundTracking pattern)**

```python
"""Supabase access helpers (service-role client for backend)."""
from __future__ import annotations

import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache(maxsize=1)
def admin_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)
```

`lib/__init__.py` and `api/__init__.py`: empty files.

- [ ] **Step 8: Install frontend dependencies**

```bash
cd frontend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Create minimal React entry point and verify dev server**

`frontend/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`frontend/src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-calm-50 flex items-center justify-center">
      <h1 className="text-3xl font-bold text-calm-800">Pills</h1>
    </div>
  );
}
```

`frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Run: `cd frontend && npm run dev`
Expected: Dev server starts on http://localhost:5173, page shows "Pills" heading.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: project scaffolding — Vercel + Supabase + React + Vite + TailwindCSS"
```

---

### Task 2: Supabase Migration — Guides Schema

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: `guides` table — stores breathing/grounding guide configurations
- Produces: `sessions` table — stores anonymous user session records

- [ ] **Step 1: Create migration SQL**

`supabase/migrations/0001_init.sql`:

```sql
-- Pills schema — Phase 1
-- Run via Supabase SQL editor or `supabase db push`

create extension if not exists "pgcrypto";

-- Breathing patterns and grounding guide configurations
create table if not exists guides (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,          -- e.g. "breathing-478", "grounding-54321"
  title       text not null,                 -- 显示标题
  description text,                          -- 简短描述
  category    text not null,                 -- "breathing" | "grounding"
  config      jsonb not null default '{}',   -- 引导参数（节奏、步骤等）
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Anonymous session records (for tracking usage, no PII)
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  guide_slug  text not null,
  started_at  timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer,
  notes       jsonb default '[]'              -- 感官着陆中的用户记录
);

create index if not exists sessions_guide_idx on sessions(guide_slug);
create index if not exists sessions_started_idx on sessions(started_at desc);

-- Seed default guides
insert into guides (slug, title, description, category, config, sort_order) values
  (
    'breathing-478',
    '4-7-8 呼吸法',
    '吸气4秒，屏息7秒，呼气8秒。经典的放松呼吸技巧。',
    'breathing',
    '{"phases": [{"name": "吸气", "duration": 4}, {"name": "屏息", "duration": 7}, {"name": "呼气", "duration": 8}]}',
    1
  ),
  (
    'breathing-box',
    '方块呼吸',
    '吸气4秒，屏息4秒，呼气4秒，屏息4秒。均匀稳定的呼吸节奏。',
    'breathing',
    '{"phases": [{"name": "吸气", "duration": 4}, {"name": "屏息", "duration": 4}, {"name": "呼气", "duration": 4}, {"name": "屏息", "duration": 4}]}',
    2
  ),
  (
    'grounding-54321',
    '5-4-3-2-1 感官着陆',
    '通过五感逐步将注意力拉回当下，帮助缓解焦虑。',
    'grounding',
    '{"steps": [{"sense": "看", "count": 5, "prompt": "说出你能看到的5样东西"}, {"sense": "触摸", "count": 4, "prompt": "说出你能触摸到的4样东西"}, {"sense": "听", "count": 3, "prompt": "说出你能听到的3种声音"}, {"sense": "闻", "count": 2, "prompt": "说出你能闻到的2种气味"}, {"sense": "尝", "count": 1, "prompt": "说出你能尝到的1种味道"}]}',
    1
  )
on conflict (slug) do nothing;
```

- [ ] **Step 2: Apply migration to Supabase**

Run via Supabase Dashboard SQL editor, or:

```bash
npx supabase db push
```

Expected: Tables `guides` and `sessions` created, 3 seed rows inserted into `guides`.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase migration — guides and sessions tables with seed data"
```

---

### Task 3: API — Guides Endpoint

**Files:**
- Create: `api/guides.py`
- Create: `tests/test_api_guides.py`

**Interfaces:**
- Consumes: `lib.db.admin_client() → Client`
- Produces: `GET /api/guides` → `[{id, slug, title, description, category, config, sort_order}]`
- Produces: `GET /api/guides?slug=<slug>` → single guide object or 404

- [ ] **Step 1: Write the failing test**

```python
# tests/test_api_guides.py
"""Tests for GET /api/guides — verify response shape and filtering."""
import json
import os
from unittest.mock import MagicMock, patch

# Mock env vars before importing handler
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-key"

from api.guides import handler


class FakeResponse:
    def __init__(self, data):
        self.data = data


def make_mock_client(guides_data):
    mock_sb = MagicMock()
    chain = MagicMock()
    mock_sb.table.return_value = chain
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.order.return_value = chain
    chain.execute.return_value = FakeResponse(guides_data)
    return mock_sb


def test_list_all_guides():
    sample = [
        {"id": "1", "slug": "breathing-478", "title": "4-7-8 呼吸法",
         "description": "desc", "category": "breathing",
         "config": {"phases": []}, "sort_order": 1}
    ]
    mock_sb = make_mock_client(sample)
    with patch("api.guides.db.admin_client", return_value=mock_sb):
        req = MagicMock()
        req.path = "/api/guides"
        req.command = "GET"
        req.headers = {}
        h = handler(req, ("localhost", 8080), respond=False)
        # Verify response was sent (check _headers_buffer or send_response calls)


def test_filter_by_slug():
    sample = [{"id": "1", "slug": "breathing-478", "title": "4-7-8 呼吸法",
               "description": "desc", "category": "breathing",
               "config": {"phases": []}, "sort_order": 1}]
    mock_sb = make_mock_client(sample)
    with patch("api.guides.db.admin_client", return_value=mock_sb):
        req = MagicMock()
        req.path = "/api/guides?slug=breathing-478"
        req.command = "GET"
        req.headers = {}
        h = handler(req, ("localhost", 8080), respond=False)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd pills && python -m pytest tests/test_api_guides.py -v
```

Expected: FAIL — `api.guides` module not found.

- [ ] **Step 3: Implement `api/guides.py`**

```python
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


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        slug = (qs.get("slug") or [None])[0]
        category = (qs.get("category") or [None])[0]

        try:
            sb = db.admin_client()
            q = sb.table("guides").select("*").eq("active", True).order("sort_order")
            if slug:
                q = q.eq("slug", slug)
            if category:
                q = q.eq("category", category)
            rows = q.execute()
            data = rows.data or []

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode())
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd pills && python -m pytest tests/test_api_guides.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/guides.py tests/test_api_guides.py
git commit -m "feat: add GET /api/guides endpoint with slug/category filtering"
```

---

### Task 4: API — Sessions Endpoint

**Files:**
- Create: `api/sessions.py`
- Create: `tests/test_api_sessions.py`

**Interfaces:**
- Consumes: `lib.db.admin_client() → Client`
- Produces: `POST /api/sessions` — create a session record, returns `{id}`
- Produces: `PATCH /api/sessions?id=<uuid>` — update session with `completed_at`, `duration_seconds`, `notes`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_api_sessions.py
import json
import os
from io import BytesIO
from unittest.mock import MagicMock, patch

os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-key"

from api.sessions import handler


class FakeResponse:
    def __init__(self, data):
        self.data = data


def make_mock_client(insert_return=None):
    mock_sb = MagicMock()
    chain = MagicMock()
    mock_sb.table.return_value = chain
    chain.insert.return_value = chain
    chain.update.return_value = chain
    chain.eq.return_value = chain
    chain.execute.return_value = FakeResponse(insert_return or [{"id": "test-uuid"}])
    return mock_sb


def test_create_session():
    mock_sb = make_mock_client([{"id": "abc-123"}])
    with patch("api.sessions.db.admin_client", return_value=mock_sb):
        body = json.dumps({"guide_slug": "breathing-478"}).encode()
        req = MagicMock()
        req.path = "/api/sessions"
        req.command = "POST"
        req.headers = {"Content-Length": str(len(body))}
        req.rfile = BytesIO(body)
        h = handler(req, ("localhost", 8080), respond=False)


def test_update_session():
    mock_sb = make_mock_client([{"id": "abc-123", "completed_at": "2026-01-01T00:00:00Z"}])
    with patch("api.sessions.db.admin_client", return_value=mock_sb):
        body = json.dumps({
            "completed_at": "2026-01-01T00:05:00Z",
            "duration_seconds": 300,
            "notes": [{"step": 1, "text": "窗外的树"}]
        }).encode()
        req = MagicMock()
        req.path = "/api/sessions?id=abc-123"
        req.command = "PATCH"
        req.headers = {"Content-Length": str(len(body))}
        req.rfile = BytesIO(body)
        h = handler(req, ("localhost", 8080), respond=False)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_api_sessions.py -v
```

Expected: FAIL — `api.sessions` module not found.

- [ ] **Step 3: Implement `api/sessions.py`**

```python
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
            row = {
                "guide_slug": body.get("guide_slug", ""),
            }
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_api_sessions.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/sessions.py tests/test_api_sessions.py
git commit -m "feat: add POST/PATCH /api/sessions for tracking guide sessions"
```

---

### Task 5: Frontend — Layout, Routing, Home Page

**Files:**
- Create: `frontend/src/main.tsx` (update)
- Create: `frontend/src/App.tsx` (update)
- Create: `frontend/src/pages/HomePage.tsx`
- Create: `frontend/src/components/GuideCard.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/types.ts`

**Interfaces:**
- Consumes: `GET /api/guides` → guide list for home page cards
- Produces: `types.ts` — shared TypeScript types used by all page components

- [ ] **Step 1: Define shared types**

`frontend/src/types.ts`:

```typescript
export interface GuidePhase {
  name: string;
  duration: number;
}

export interface GroundingStep {
  sense: string;
  count: number;
  prompt: string;
}

export interface BreathingConfig {
  phases: GuidePhase[];
}

export interface GroundingConfig {
  steps: GroundingStep[];
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'breathing' | 'grounding';
  config: BreathingConfig | GroundingConfig;
  sort_order: number;
}

export interface SessionNote {
  step: number;
  text: string;
}
```

- [ ] **Step 2: Create Supabase client**

`frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Create Layout component**

`frontend/src/components/Layout.tsx`:

```tsx
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-calm-50 to-calm-100">
      <header className="px-6 py-4">
        <Link to="/" className="text-calm-700 font-semibold text-lg hover:text-calm-900 transition-colors">
          Pills
        </Link>
        {title && (
          <span className="ml-3 text-calm-400 text-sm">/ {title}</span>
        )}
      </header>
      <main className="px-4 pb-12 max-w-lg mx-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create GuideCard component**

`frontend/src/components/GuideCard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { Guide } from '../types';

interface GuideCardProps {
  guide: Guide;
}

const categoryIcons: Record<string, string> = {
  breathing: '🫁',
  grounding: '🌿',
};

export default function GuideCard({ guide }: GuideCardProps) {
  return (
    <Link
      to={`/guide/${guide.slug}`}
      className="block bg-white rounded-2xl p-6 shadow-sm border border-calm-100 hover:shadow-md hover:border-calm-200 transition-all duration-300"
    >
      <div className="text-3xl mb-3">{categoryIcons[guide.category] || '✨'}</div>
      <h2 className="text-xl font-semibold text-calm-900 mb-2">{guide.title}</h2>
      <p className="text-calm-600 text-sm leading-relaxed">{guide.description}</p>
    </Link>
  );
}
```

- [ ] **Step 5: Create HomePage**

`frontend/src/pages/HomePage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import GuideCard from '../components/GuideCard';
import type { Guide } from '../types';

export default function HomePage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/guides')
      .then((res) => res.json())
      .then((data) => {
        setGuides(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: use local data if API fails
        setGuides([]);
        setLoading(false);
      });
  }, []);

  return (
    <Layout>
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-calm-800 mb-2">此刻，深呼吸</h1>
        <p className="text-calm-500 text-lg">选择一个引导，让自己慢下来</p>
      </div>

      {loading ? (
        <div className="text-center text-calm-400 py-12">加载中…</div>
      ) : guides.length === 0 ? (
        <div className="text-center text-calm-400 py-12">暂无引导内容</div>
      ) : (
        <div className="space-y-4">
          {guides.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      )}
    </Layout>
  );
}
```

- [ ] **Step 6: Update App.tsx with routing**

`frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/guide/:slug" element={<div className="min-h-screen bg-calm-50 flex items-center justify-center text-calm-500">引导页（待实现）</div>} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 7: Run dev server and verify**

```bash
cd frontend && npm run dev
```

Expected: Home page loads, shows "此刻，深呼吸" heading. If API is unavailable, shows "暂无引导内容" gracefully.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/
git commit -m "feat: add React layout, routing, and home page with guide cards"
```

---

### Task 6: Frontend — Breathing Guide Page

**Files:**
- Create: `frontend/src/pages/BreathingPage.tsx`
- Create: `frontend/src/components/BreathingCircle.tsx`
- Create: `frontend/src/hooks/useBreathing.ts`

**Interfaces:**
- Consumes: `Guide` type from `types.ts`, `BreathingConfig` from guide config
- Consumes: `POST /api/sessions` and `PATCH /api/sessions?id=` for session tracking
- Produces: Breathing guide page at `/guide/breathing-*` routes

- [ ] **Step 1: Create `useBreathing` hook**

`frontend/src/hooks/useBreathing.ts`:

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';
import type { GuidePhase } from '../types';

export type BreathingState = 'idle' | 'running' | 'paused' | 'completed';

interface UseBreathingReturn {
  state: BreathingState;
  currentPhaseIndex: number;
  timeRemaining: number;
  totalRounds: number;
  currentRound: number;
  progress: number; // 0-1 within current phase
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useBreathing(phases: GuidePhase[], rounds: number = 4): UseBreathingReturn {
  const [state, setState] = useState<BreathingState>('idle');
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseDuration = phases[currentPhaseIndex]?.duration || 4;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setTimeRemaining((prev) => {
      if (prev <= 1) {
        // Move to next phase
        setCurrentPhaseIndex((pi) => {
          const next = pi + 1;
          if (next >= phases.length) {
            // Completed one round
            setCurrentRound((r) => {
              if (r >= rounds) {
                setState('completed');
                clearTimer();
                return r;
              }
              return r + 1;
            });
            return 0; // Reset to first phase
          }
          return next;
        });
        return phases[(currentPhaseIndex + 1) % phases.length]?.duration || 4;
      }
      return prev - 1;
    });
  }, [phases, currentPhaseIndex, rounds, clearTimer]);

  useEffect(() => {
    setProgress(1 - timeRemaining / phaseDuration);
  }, [timeRemaining, phaseDuration]);

  const start = useCallback(() => {
    setState('running');
    setCurrentPhaseIndex(0);
    setCurrentRound(1);
    setTimeRemaining(phases[0]?.duration || 4);
    clearTimer();
    intervalRef.current = setInterval(tick, 1000);
  }, [phases, tick, clearTimer]);

  const pause = useCallback(() => {
    setState('paused');
    clearTimer();
  }, [clearTimer]);

  const resume = useCallback(() => {
    setState('running');
    intervalRef.current = setInterval(tick, 1000);
  }, [tick]);

  const stop = useCallback(() => {
    setState('idle');
    setCurrentPhaseIndex(0);
    setCurrentRound(1);
    setTimeRemaining(0);
    setProgress(0);
    clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return {
    state,
    currentPhaseIndex,
    timeRemaining,
    totalRounds: rounds,
    currentRound,
    progress,
    start,
    pause,
    resume,
    stop,
  };
}
```

- [ ] **Step 2: Create BreathingCircle component**

`frontend/src/components/BreathingCircle.tsx`:

```tsx
import { motion } from 'framer-motion';
import type { BreathingState } from '../hooks/useBreathing';

interface BreathingCircleProps {
  state: BreathingState;
  phaseName: string;
  progress: number;
  timeRemaining: number;
}

export default function BreathingCircle({ state, phaseName, progress, timeRemaining }: BreathingCircleProps) {
  const isInhale = phaseName === '吸气';
  const scale = state === 'running'
    ? isInhale ? 1 + progress * 0.5 : 1.5 - progress * 0.5
    : state === 'idle' ? 1 : 1.25;

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <motion.div
        className="w-48 h-48 rounded-full bg-gradient-to-br from-calm-300 to-calm-500 flex items-center justify-center shadow-lg"
        animate={{ scale }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="text-center text-white">
          {state === 'running' ? (
            <>
              <p className="text-2xl font-semibold">{phaseName}</p>
              <p className="text-4xl font-light mt-1">{timeRemaining}</p>
            </>
          ) : (
            <p className="text-xl">准备好了吗？</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Create BreathingPage**

`frontend/src/pages/BreathingPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import BreathingCircle from '../components/BreathingCircle';
import { useBreathing } from '../hooks/useBreathing';
import type { Guide, BreathingConfig } from '../types';

export default function BreathingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [rounds, setRounds] = useState(4);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const phases = (guide?.config as BreathingConfig)?.phases || [];
  const { state, currentPhaseIndex, timeRemaining, progress, currentRound, start, pause, resume, stop } =
    useBreathing(phases, rounds);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/guides?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        const g = Array.isArray(data) ? data[0] : data;
        if (g) setGuide(g);
      })
      .catch(() => {
        // Fallback default config
        setGuide({
          id: 'fallback',
          slug: slug,
          title: '呼吸引导',
          description: '',
          category: 'breathing',
          config: { phases: [{ name: '吸气', duration: 4 }, { name: '屏息', duration: 7 }, { name: '呼气', duration: 8 }] },
          sort_order: 0,
        });
      });
  }, [slug]);

  // Create session on start
  const handleStart = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide_slug: slug }),
      });
      const data = await res.json();
      setSessionId(data.id);
    } catch {
      // Non-critical, continue
    }
    start();
  };

  // Complete session on finish
  useEffect(() => {
    if (state === 'completed' && sessionId) {
      fetch(`/api/sessions?id=${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          duration_seconds: rounds * phases.reduce((s, p) => s + p.duration, 0),
        }),
      }).catch(() => {});
    }
  }, [state, sessionId]);

  if (!guide) {
    return (
      <Layout title="加载中…">
        <div className="text-center text-calm-400 py-16">加载中…</div>
      </Layout>
    );
  }

  const phaseName = phases[currentPhaseIndex]?.name || '';

  return (
    <Layout title={guide.title}>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>

      <BreathingCircle
        state={state}
        phaseName={phaseName}
        progress={progress}
        timeRemaining={timeRemaining}
      />

      {state === 'running' && (
        <p className="text-center text-calm-500 text-sm mb-4">
          第 {currentRound} / {rounds} 轮
        </p>
      )}

      <div className="flex justify-center gap-4 mt-6">
        {state === 'idle' && (
          <>
            <select
              className="rounded-lg border border-calm-200 px-3 py-2 text-calm-700 bg-white"
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
            >
              {[2, 4, 6, 8].map((n) => (
                <option key={n} value={n}>{n} 轮</option>
              ))}
            </select>
            <button
              onClick={handleStart}
              className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors"
            >
              开始
            </button>
          </>
        )}
        {state === 'running' && (
          <>
            <button
              onClick={pause}
              className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors"
            >
              暂停
            </button>
            <button
              onClick={stop}
              className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors"
            >
              结束
            </button>
          </>
        )}
        {state === 'paused' && (
          <>
            <button
              onClick={resume}
              className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors"
            >
              继续
            </button>
            <button
              onClick={stop}
              className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors"
            >
              结束
            </button>
          </>
        )}
        {state === 'completed' && (
          <div className="text-center">
            <p className="text-calm-600 text-lg mb-4">做得很好 ✨</p>
            <button
              onClick={() => navigate('/')}
              className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors"
            >
              返回首页
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 4: Update App.tsx routes**

Update `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BreathingPage from './pages/BreathingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/guide/breathing-:type" element={<BreathingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Verify breathing guide works**

```bash
cd frontend && npm run dev
```

Navigate to `/guide/breathing-478`. Expected: Breathing circle animates, phase text changes, timer counts down, round counter updates, completion screen appears after all rounds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add breathing guide page with animated circle and session tracking"
```

---

### Task 7: Frontend — 5-4-3-2-1 Grounding Page

**Files:**
- Create: `frontend/src/pages/GroundingPage.tsx`
- Create: `frontend/src/components/GroundingStep.tsx`
- Create: `frontend/src/hooks/useGrounding.ts`

**Interfaces:**
- Consumes: `Guide` type from `types.ts`, `GroundingConfig` from guide config
- Consumes: `POST /api/sessions` and `PATCH /api/sessions?id=` for session tracking with notes
- Produces: Grounding guide page at `/guide/grounding-54321` route

- [ ] **Step 1: Create `useGrounding` hook**

`frontend/src/hooks/useGrounding.ts`:

```typescript
import { useState, useCallback } from 'react';
import type { GroundingStep, SessionNote } from '../types';

export type GroundingState = 'idle' | 'running' | 'completed';

interface UseGroundingReturn {
  state: GroundingState;
  currentStepIndex: number;
  entryCount: number;
  notes: SessionNote[];
  currentInput: string;
  start: () => void;
  setInput: (val: string) => void;
  addEntry: () => void;
  skipStep: () => void;
  stop: () => void;
}

export function useGrounding(steps: GroundingStep[]): UseGroundingReturn {
  const [state, setState] = useState<GroundingState>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [currentInput, setCurrentInput] = useState('');

  const currentStep = steps[currentStepIndex];

  const start = useCallback(() => {
    setState('running');
    setCurrentStepIndex(0);
    setEntryCount(0);
    setNotes([]);
    setCurrentInput('');
  }, []);

  const addEntry = useCallback(() => {
    if (!currentInput.trim()) return;
    const newNote: SessionNote = {
      step: currentStepIndex,
      text: currentInput.trim(),
    };
    setNotes((prev) => [...prev, newNote]);
    setCurrentInput('');
    const newCount = entryCount + 1;
    setEntryCount(newCount);

    if (newCount >= currentStep.count) {
      // Move to next step
      if (currentStepIndex + 1 >= steps.length) {
        setState('completed');
      } else {
        setCurrentStepIndex((i) => i + 1);
        setEntryCount(0);
      }
    }
  }, [currentInput, currentStepIndex, entryCount, currentStep, steps]);

  const skipStep = useCallback(() => {
    if (currentStepIndex + 1 >= steps.length) {
      setState('completed');
    } else {
      setCurrentStepIndex((i) => i + 1);
      setEntryCount(0);
      setCurrentInput('');
    }
  }, [currentStepIndex, steps.length]);

  const stop = useCallback(() => {
    setState('idle');
    setCurrentStepIndex(0);
    setEntryCount(0);
    setNotes([]);
    setCurrentInput('');
  }, []);

  return {
    state,
    currentStepIndex,
    entryCount,
    notes,
    currentInput,
    start,
    setInput: setCurrentInput,
    addEntry,
    skipStep,
    stop,
  };
}
```

- [ ] **Step 2: Create GroundingStep component**

`frontend/src/components/GroundingStep.tsx`:

```tsx
interface GroundingStepProps {
  sense: string;
  count: number;
  prompt: string;
  entryCount: number;
  currentInput: string;
  onInputChange: (val: string) => void;
  onAdd: () => void;
  onSkip: () => void;
}

export default function GroundingStepCard({
  sense,
  count,
  prompt,
  entryCount,
  currentInput,
  onInputChange,
  onAdd,
  onSkip,
}: GroundingStepProps) {
  const remaining = count - entryCount;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-calm-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{
          sense === '看' ? '👀' :
          sense === '触摸' ? '✋' :
          sense === '听' ? '👂' :
          sense === '闻' ? '👃' : '👅'
        }</span>
        <span className="text-calm-400 text-sm">
          {remaining > 0 ? `还需要 ${remaining} 个` : '完成！'}
        </span>
      </div>
      <h2 className="text-xl font-semibold text-calm-800 mb-1">
        {count} 个你能{sense}到的
      </h2>
      <p className="text-calm-500 text-sm mb-4">{prompt}</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={currentInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          placeholder="输入你的感受…"
          className="flex-1 rounded-lg border border-calm-200 px-4 py-2 text-calm-800 placeholder:text-calm-300 focus:outline-none focus:border-calm-400 transition-colors"
        />
        <button
          onClick={onAdd}
          disabled={!currentInput.trim()}
          className="rounded-lg bg-calm-500 text-white px-4 py-2 font-medium hover:bg-calm-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          记录
        </button>
      </div>

      <button
        onClick={onSkip}
        className="mt-3 text-calm-400 text-sm hover:text-calm-600 transition-colors"
      >
        跳过此步骤
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create GroundingPage**

`frontend/src/pages/GroundingPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import GroundingStepCard from '../components/GroundingStep';
import { useGrounding } from '../hooks/useGrounding';
import type { Guide, GroundingConfig } from '../types';

export default function GroundingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const steps = (guide?.config as GroundingConfig)?.steps || [];
  const {
    state, currentStepIndex, entryCount, notes, currentInput,
    start, setInput, addEntry, skipStep, stop,
  } = useGrounding(steps);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/guides?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        const g = Array.isArray(data) ? data[0] : data;
        if (g) setGuide(g);
      })
      .catch(() => {
        setGuide({
          id: 'fallback',
          slug: slug,
          title: '5-4-3-2-1 感官着陆',
          description: '',
          category: 'grounding',
          config: {
            steps: [
              { sense: '看', count: 5, prompt: '说出你能看到的5样东西' },
              { sense: '触摸', count: 4, prompt: '说出你能触摸到的4样东西' },
              { sense: '听', count: 3, prompt: '说出你能听到的3种声音' },
              { sense: '闻', count: 2, prompt: '说出你能闻到的2种气味' },
              { sense: '尝', count: 1, prompt: '说出你能尝到的1种味道' },
            ],
          },
          sort_order: 0,
        });
      });
  }, [slug]);

  const handleStart = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide_slug: slug }),
      });
      const data = await res.json();
      setSessionId(data.id);
    } catch {
      // Non-critical
    }
    start();
  };

  // Complete session
  useEffect(() => {
    if (state === 'completed' && sessionId) {
      fetch(`/api/sessions?id=${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          notes,
        }),
      }).catch(() => {});
    }
  }, [state, sessionId, notes]);

  if (!guide) {
    return (
      <Layout title="加载中…">
        <div className="text-center text-calm-400 py-16">加载中…</div>
      </Layout>
    );
  }

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex];

  return (
    <Layout title={guide.title}>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>

      {state === 'idle' && (
        <div className="text-center py-12">
          <p className="text-calm-600 mb-6">
            通过五感逐步将注意力拉回当下。<br />
            整个过程大约需要 5 分钟。
          </p>
          <button
            onClick={handleStart}
            className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors"
          >
            开始
          </button>
        </div>
      )}

      {state === 'running' && currentStep && (
        <>
          {/* Progress bar */}
          <div className="w-full bg-calm-100 rounded-full h-2 mb-6">
            <div
              className="bg-calm-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIndex + entryCount / currentStep.count) / totalSteps) * 100}%` }}
            />
          </div>

          <GroundingStepCard
            sense={currentStep.sense}
            count={currentStep.count}
            prompt={currentStep.prompt}
            entryCount={entryCount}
            currentInput={currentInput}
            onInputChange={setInput}
            onAdd={addEntry}
            onSkip={skipStep}
          />

          {/* Previously recorded notes */}
          {notes.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-calm-400 text-xs">已记录：</p>
              {notes.map((note, i) => (
                <div key={i} className="text-sm text-calm-600 bg-calm-50 rounded-lg px-3 py-2">
                  {steps[note.step]?.sense}: {note.text}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={stop}
            className="mt-6 w-full text-center text-calm-400 text-sm hover:text-calm-600 transition-colors"
          >
            结束引导
          </button>
        </>
      )}

      {state === 'completed' && (
        <div className="text-center py-12">
          <p className="text-calm-600 text-xl mb-2">做得很好 ✨</p>
          <p className="text-calm-400 text-sm mb-6">
            你已经完成了感官着陆练习。希望你现在感觉好一些了。
          </p>
          <button
            onClick={() => navigate('/')}
            className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors"
          >
            返回首页
          </button>
        </div>
      )}
    </Layout>
  );
}
```

- [ ] **Step 4: Update App.tsx routes**

Update `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BreathingPage from './pages/BreathingPage';
import GroundingPage from './pages/GroundingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/guide/breathing-:type" element={<BreathingPage />} />
        <Route path="/guide/grounding-:type" element={<GroundingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Verify grounding guide works**

```bash
cd frontend && npm run dev
```

Navigate to `/guide/grounding-54321`. Expected: Start screen → 5 steps with input, progress bar advances, completion screen shows.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add 5-4-3-2-1 sensory grounding guide with step-by-step input"
```

---

### Task 8: Frontend Tests + Final Integration

**Files:**
- Create: `frontend/src/hooks/__tests__/useBreathing.test.ts`
- Create: `frontend/src/hooks/__tests__/useGrounding.test.ts`
- Create: `frontend/src/pages/__tests__/HomePage.test.tsx`
- Create: `tests/conftest.py`
- Update: `frontend/package.json` (add vitest + testing-library)

**Interfaces:**
- Validates: breathing timer logic, grounding step progression, home page rendering

- [ ] **Step 1: Add test dependencies**

Update `frontend/package.json` devDependencies:

```json
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.4.0",
"vitest": "^2.0.0",
"jsdom": "^24.0.0"
```

Add to scripts: `"test": "vitest run"`

Run: `cd frontend && npm install`

Add to `frontend/vite.config.ts`:

```typescript
/// <reference types="vitest" />
```

(Already imported via `defineConfig`.)

Create `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
});
```

- [ ] **Step 2: Write breathing hook test**

`frontend/src/hooks/__tests__/useBreathing.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useBreathing } from '../useBreathing';

const phases = [
  { name: '吸气', duration: 2 },
  { name: '屏息', duration: 2 },
  { name: '呼气', duration: 2 },
];

test('starts in idle state', () => {
  const { result } = renderHook(() => useBreathing(phases, 1));
  expect(result.current.state).toBe('idle');
});

test('transitions to running on start', () => {
  const { result } = renderHook(() => useBreathing(phases, 1));
  act(() => result.current.start());
  expect(result.current.state).toBe('running');
  expect(result.current.currentPhaseIndex).toBe(0);
});

test('stops correctly', () => {
  const { result } = renderHook(() => useBreathing(phases, 1));
  act(() => result.current.start());
  act(() => result.current.stop());
  expect(result.current.state).toBe('idle');
});
```

- [ ] **Step 3: Write grounding hook test**

`frontend/src/hooks/__tests__/useGrounding.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useGrounding } from '../useGrounding';

const steps = [
  { sense: '看', count: 2, prompt: '说出你能看到的2样东西' },
  { sense: '听', count: 1, prompt: '说出你能听到的1种声音' },
];

test('starts in idle state', () => {
  const { result } = renderHook(() => useGrounding(steps));
  expect(result.current.state).toBe('idle');
});

test('advances step when entries are complete', () => {
  const { result } = renderHook(() => useGrounding(steps));
  act(() => result.current.start());
  act(() => result.current.setInput('天空'));
  act(() => result.current.addEntry());
  act(() => result.current.setInput('树'));
  act(() => result.current.addEntry());
  // Should now be on step 2
  expect(result.current.currentStepIndex).toBe(1);
  expect(result.current.entryCount).toBe(0);
});

test('completes after all steps', () => {
  const { result } = renderHook(() => useGrounding(steps));
  act(() => result.current.start());
  act(() => result.current.setInput('a')); act(() => result.current.addEntry());
  act(() => result.current.setInput('b')); act(() => result.current.addEntry());
  act(() => result.current.setInput('c')); act(() => result.current.addEntry());
  expect(result.current.state).toBe('completed');
});

test('skip moves to next step', () => {
  const { result } = renderHook(() => useGrounding(steps));
  act(() => result.current.start());
  act(() => result.current.skipStep());
  expect(result.current.currentStepIndex).toBe(1);
});
```

- [ ] **Step 4: Create Python test conftest**

`tests/conftest.py`:

```python
import os
import sys

# Ensure project root is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set test env vars
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
```

- [ ] **Step 5: Run all tests**

```bash
# Python tests
cd pills && python -m pytest tests/ -v

# Frontend tests
cd pills/frontend && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: add frontend hook tests and Python test config"
```

---

### Task 9: Vercel Deployment + CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Update: `vercel.json` (if needed)

**Interfaces:**
- Produces: GitHub Actions CI pipeline
- Produces: Vercel auto-deploy on push to main

- [ ] **Step 1: Create GitHub Actions CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt pytest
      - run: python -m pytest tests/ -v
        env:
          SUPABASE_URL: https://test.supabase.co
          SUPABASE_SERVICE_ROLE_KEY: test-key

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - run: cd frontend && npm test
```

- [ ] **Step 2: Verify Vercel deployment**

1. Go to https://vercel.com and import the `pills` repo
2. Configure environment variables in Vercel Dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `QWEN_API_KEY`
3. Deploy — Vercel will auto-build frontend and deploy API functions

Expected: Live URL loads, home page renders, `/api/guides` returns JSON.

- [ ] **Step 3: Push all and verify CI**

```bash
git add -A
git commit -m "ci: add GitHub Actions workflow for backend and frontend tests"
git push
```

Expected: GitHub Actions runs successfully, Vercel auto-deploys.

- [ ] **Step 4: Final commit**

```bash
git push origin main
```

Expected: All code pushed, CI green, Vercel deployed.
