# Session History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add session tracking and a history page so users can see their past guide sessions.

**Architecture:** Add a GET endpoint to the existing sessions API. Build a history page with session cards. Extract duplicated session-tracking code from guide pages into a shared `useSession` hook.

**Tech Stack:** Python (Vercel serverless), React + TypeScript, Supabase, Tailwind CSS, Vitest

## Global Constraints

- API responses use JSON with `ensure_ascii=False`
- CORS headers via `lib.cors.send_cors_headers`
- Input validation on all API endpoints (payload limits, param clamping)
- Session creation/completion failures are silent — don't block guide experience
- Frontend uses existing `calm-*` Tailwind color palette
- Date format: "7月12日 11:05" (Chinese locale)

---

### Task 1: GET /api/sessions Endpoint

**Files:**
- Modify: `api/sessions.py` (add `do_GET` method)
- Test: `tests/test_api_sessions.py` (add GET tests)

**Interfaces:**
- Consumes: `lib.db.admin_client() → supabase.Client`, `lib.cors.send_cors_headers()`
- Produces: `GET /api/sessions?limit=50&offset=0` → `{ sessions: [...], total: number }`

- [ ] **Step 1: Write failing test for GET /api/sessions**

Add to `tests/test_api_sessions.py`:

```python
def test_get_sessions():
    mock = make_mock_client([
        {"id": "s1", "guide_slug": "breathing-478", "started_at": "2026-07-12T09:00:00Z", "completed_at": "2026-07-12T09:05:00Z", "duration_seconds": 300},
        {"id": "s2", "guide_slug": "grounding-54321", "started_at": "2026-07-12T08:00:00Z", "completed_at": None, "duration_seconds": None},
    ])
    mock.table.return_value.select.return_value = mock.table.return_value
    mock.table.return_value.select.return_value.order.return_value = mock.table.return_value
    mock.table.return_value.select.return_value.execute.return_value = FakeResponse([
        {"id": "s1", "guide_slug": "breathing-478", "started_at": "2026-07-12T09:00:00Z", "completed_at": "2026-07-12T09:05:00Z", "duration_seconds": 300},
        {"id": "s2", "guide_slug": "grounding-54321", "started_at": "2026-07-12T08:00:00Z", "completed_at": None, "duration_seconds": None},
    ])
    result = _call_handler(mock, "GET", "/api/sessions")
    assert "sessions" in result
    assert len(result["sessions"]) == 2
    assert result["total"] == 2

def test_get_sessions_default_limit():
    mock = make_mock_client([])
    mock.table.return_value.select.return_value = mock.table.return_value
    mock.table.return_value.select.return_value.order.return_value = mock.table.return_value
    mock.table.return_value.select.return_value.execute.return_value = FakeResponse([])
    result = _call_handler(mock, "GET", "/api/sessions")
    assert result["sessions"] == []
    assert result["total"] == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/pills && python -m pytest tests/test_api_sessions.py -v`
Expected: FAIL — `do_GET` not defined on handler

- [ ] **Step 3: Implement GET handler in sessions.py**

Add `do_GET` method to `api/sessions.py`:

```python
def do_GET(self):
    qs = parse_qs(urlparse(self.path).query)
    try:
        limit = min(max(int(qs.get("limit", ["50"])[0]), 1), 100)
    except (ValueError, IndexError):
        limit = 50
    try:
        offset = max(int(qs.get("offset", ["0"])[0]), 0)
    except (ValueError, IndexError):
        offset = 0

    try:
        sb = db.admin_client()
        rows = sb.table("sessions").select("*").order("started_at", desc=True).range(offset, offset + limit - 1).execute()
        data = rows.data or []
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        send_cors_headers(self)
        self.end_headers()
        self.wfile.write(json.dumps({"sessions": data, "total": len(data)}, ensure_ascii=False).encode())
    except Exception:
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        send_cors_headers(self)
        self.end_headers()
        self.wfile.write(json.dumps({"sessions": [], "total": 0}, ensure_ascii=False).encode())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/pills && python -m pytest tests/test_api_sessions.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add api/sessions.py tests/test_api_sessions.py
git commit -m "feat: add GET /api/sessions with pagination"
```

---

### Task 2: useSession Hook

**Files:**
- Create: `frontend/src/hooks/useSession.ts`
- Test: `frontend/src/hooks/__tests__/useSession.test.ts`

**Interfaces:**
- Consumes: `POST /api/sessions`, `PATCH /api/sessions?id=xxx`
- Produces: `useSession(guideSlug: string) → { sessionId, startSession, completeSession }`

- [ ] **Step 1: Write the hook**

Create `frontend/src/hooks/useSession.ts`:

```typescript
import { useState, useCallback, useRef } from 'react';

export function useSession(guideSlug: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const startSession = useCallback(async () => {
    startTimeRef.current = Date.now();
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide_slug: guideSlug }),
      });
      const data = await res.json();
      setSessionId(data.id);
    } catch {
      // Silent failure — don't block guide experience
    }
  }, [guideSlug]);

  const completeSession = useCallback(() => {
    if (!sessionId) return;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    fetch(`/api/sessions?id=${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      }),
    }).catch(() => {
      // Silent failure
    });
  }, [sessionId]);

  return { sessionId, startSession, completeSession };
}
```

- [ ] **Step 2: Write test**

Create `frontend/src/hooks/__tests__/useSession.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from '../useSession';

describe('useSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with null sessionId', () => {
    const { result } = renderHook(() => useSession('breathing-478'));
    expect(result.current.sessionId).toBeNull();
  });

  it('startSession calls POST and sets sessionId', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ id: 'test-id-123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useSession('breathing-478'));

    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.sessionId).toBe('test-id-123');
    expect(mockFetch).toHaveBeenCalledWith('/api/sessions', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('completeSession calls PATCH with duration', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ id: 'test-id' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useSession('breathing-478'));

    await act(async () => {
      await result.current.startSession();
    });

    act(() => {
      result.current.completeSession();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toContain('/api/sessions?id=test-id');
    expect(mockFetch.mock.calls[1][1].method).toBe('PATCH');
  });

  it('completeSession does nothing without sessionId', () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useSession('breathing-478'));

    act(() => {
      result.current.completeSession();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd ~/pills/frontend && npx vitest run src/hooks/__tests__/useSession.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useSession.ts frontend/src/hooks/__tests__/useSession.test.ts
git commit -m "feat: add useSession hook for session tracking"
```

---

### Task 3: Refactor Guide Pages to use useSession

**Files:**
- Modify: `frontend/src/pages/BreathingPage.tsx`
- Modify: `frontend/src/pages/GroundingPage.tsx`
- Modify: `frontend/src/pages/MuscleRelaxPage.tsx`
- Modify: `frontend/src/pages/MindfulnessPage.tsx`

**Interfaces:**
- Consumes: `useSession(guideSlug)` from Task 2
- Produces: Same behavior, but using shared hook

- [ ] **Step 1: Refactor BreathingPage**

Replace inline session tracking with `useSession`:

```typescript
// Add import
import { useSession } from '../hooks/useSession';

// In component, replace sessionId state and handleStart logic:
const { sessionId, startSession, completeSession } = useSession(slug);

const handleStart = async () => {
  await unlockAudio();
  await startSession();
  if (soundOn) startBgMusic();
  playBell();
  if (soundOn) playVoice('start');
  start();
};

// In the completion useEffect, replace fetch with:
useEffect(() => {
  if (state === 'completed') {
    stopBgMusic();
    completeSession();
    if (soundOn) { playBell(); playVoice('finish'); }
  }
}, [state, completeSession, soundOn, playBell, playVoice, stopBgMusic]);
```

Remove the old `sessionId` state, old `handleStart` fetch logic, and old completion fetch.

- [ ] **Step 2: Refactor GroundingPage**

Same pattern — replace inline session code with `useSession(slug)`:

```typescript
import { useSession } from '../hooks/useSession';

// Replace sessionId state + handleStart fetch
const { startSession, completeSession } = useSession(slug);

const handleStart = async () => {
  await unlockAudio();
  await startSession();
  playBell();
  start();
};

// Replace completion fetch with completeSession()
```

- [ ] **Step 3: Refactor MuscleRelaxPage**

Same pattern:

```typescript
import { useSession } from '../hooks/useSession';

const { startSession, completeSession } = useSession(slug);

// Replace inline session code in handleStart and completion handler
```

- [ ] **Step 4: Refactor MindfulnessPage**

Same pattern:

```typescript
import { useSession } from '../hooks/useSession';

const { startSession, completeSession } = useSession(slug);

// Replace inline session code in handleStart and completion handler
```

- [ ] **Step 5: Verify build passes**

Run: `cd ~/pills/frontend && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/
git commit -m "refactor: extract session tracking into useSession hook"
```

---

### Task 4: SessionCard Component

**Files:**
- Create: `frontend/src/components/SessionCard.tsx`
- Test: `frontend/src/components/__tests__/SessionCard.test.tsx`

**Interfaces:**
- Consumes: Session data object `{ id, guide_slug, started_at, completed_at, duration_seconds }`
- Produces: Rendered card component

- [ ] **Step 1: Write the component**

Create `frontend/src/components/SessionCard.tsx`:

```tsx
import type { Guide } from '../types';

interface SessionData {
  id: string;
  guide_slug: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

interface SessionCardProps {
  session: SessionData;
  guides: Guide[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '进行中';
  if (seconds < 60) return `${seconds}秒`;
  return `${Math.round(seconds / 60)}分钟`;
}

const categoryIcons: Record<string, string> = {
  breathing: '🫁',
  grounding: '🌿',
  muscle_relax: '💆',
  mindfulness: '🧘',
};

export default function SessionCard({ session, guides }: SessionCardProps) {
  const guide = guides.find((g) => g.slug === session.guide_slug);
  const category = guide?.category || '';
  const title = guide?.title || session.guide_slug;
  const icon = categoryIcons[category] || '✨';
  const isComplete = session.completed_at !== null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-calm-100">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-calm-800 text-sm truncate">{title}</h3>
          <p className="text-calm-400 text-xs">{formatDate(session.started_at)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-medium ${isComplete ? 'text-calm-600' : 'text-calm-400'}`}>
            {formatDuration(session.duration_seconds)}
          </p>
          {!isComplete && <p className="text-calm-300 text-xs">进行中</p>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write test**

Create `frontend/src/components/__tests__/SessionCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SessionCard from '../SessionCard';

const mockGuides = [
  { id: '1', slug: 'breathing-478', title: '4-7-8 呼吸法', description: '', category: 'breathing' as const, config: { phases: [] }, sort_order: 1 },
];

it('renders guide title and formatted date', () => {
  const session = {
    id: 's1',
    guide_slug: 'breathing-478',
    started_at: '2026-07-12T03:05:00Z',
    completed_at: '2026-07-12T03:10:00Z',
    duration_seconds: 300,
  };

  render(<SessionCard session={session} guides={mockGuides} />);
  expect(screen.getByText('4-7-8 呼吸法')).toBeTruthy();
  expect(screen.getByText('5分钟')).toBeTruthy();
});

it('shows 进行中 for incomplete session', () => {
  const session = {
    id: 's2',
    guide_slug: 'breathing-478',
    started_at: '2026-07-12T03:05:00Z',
    completed_at: null,
    duration_seconds: null,
  };

  render(<SessionCard session={session} guides={mockGuides} />);
  expect(screen.getByText('进行中')).toBeTruthy();
});

it('falls back to slug when guide not found', () => {
  const session = {
    id: 's3',
    guide_slug: 'unknown-guide',
    started_at: '2026-07-12T03:05:00Z',
    completed_at: '2026-07-12T03:10:00Z',
    duration_seconds: 120,
  };

  render(<SessionCard session={session} guides={mockGuides} />);
  expect(screen.getByText('unknown-guide')).toBeTruthy();
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd ~/pills/frontend && npx vitest run src/components/__tests__/SessionCard.test.tsx`
Expected: All 3 tests PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/SessionCard.tsx frontend/src/components/__tests__/SessionCard.test.tsx
git commit -m "feat: add SessionCard component"
```

---

### Task 5: useSessions Hook

**Files:**
- Create: `frontend/src/hooks/useSessions.ts`
- Test: `frontend/src/hooks/__tests__/useSessions.test.ts`

**Interfaces:**
- Consumes: `GET /api/sessions?limit=50&offset=0`
- Produces: `useSessions() → { sessions, loading, error, retry }`

- [ ] **Step 1: Write the hook**

Create `frontend/src/hooks/useSessions.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';

interface Session {
  id: string;
  guide_slug: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}

export function useSessions(limit = 50, offset = 0): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const retry = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/sessions?limit=${limit}&offset=${offset}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setSessions(data.sessions || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [limit, offset, refreshKey]);

  return { sessions, loading, error, retry };
}
```

- [ ] **Step 2: Write test**

Create `frontend/src/hooks/__tests__/useSessions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSessions } from '../useSessions';

describe('useSessions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns sessions on success', async () => {
    const mockSessions = [
      { id: 's1', guide_slug: 'breathing-478', started_at: '2026-07-12T09:00:00Z', completed_at: '2026-07-12T09:05:00Z', duration_seconds: 300 },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ sessions: mockSessions, total: 1 }),
    }));

    const { result } = renderHook(() => useSessions());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessions).toEqual(mockSessions);
    expect(result.current.error).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const { result } = renderHook(() => useSessions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.sessions).toEqual([]);
  });

  it('retry triggers a new fetch', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ sessions: [], total: 0 }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ sessions: [{ id: 's1' }], total: 1 }) });
    vi.stubGlobal('fetch', mockFetch);

    const { result } = renderHook(() => useSessions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger retry
    result.current.retry();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd ~/pills/frontend && npx vitest run src/hooks/__tests__/useSessions.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useSessions.ts frontend/src/hooks/__tests__/useSessions.test.ts
git commit -m "feat: add useSessions hook for fetching session history"
```

---

### Task 6: HistoryPage + Routing

**Files:**
- Create: `frontend/src/pages/HistoryPage.tsx`
- Modify: `frontend/src/App.tsx` (add route)
- Modify: `frontend/src/pages/HomePage.tsx` (add link)

**Interfaces:**
- Consumes: `useSessions()` from Task 5, `SessionCard` from Task 4, `GET /api/guides` for titles

- [ ] **Step 1: Create HistoryPage**

Create `frontend/src/pages/HistoryPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import SessionCard from '../components/SessionCard';
import { useSessions } from '../hooks/useSessions';
import type { Guide } from '../types';

export default function HistoryPage() {
  const { sessions, loading, error, retry } = useSessions();
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    fetch('/api/guides')
      .then((res) => res.json())
      .then((data) => setGuides(Array.isArray(data) ? data : []))
      .catch(() => setGuides([]));
  }, []);

  return (
    <Layout title="历史记录">
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-calm-400 py-12">加载中…</div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-calm-400 mb-4">加载失败，请稍后再试</p>
            <button onClick={retry} className="rounded-full bg-calm-500 text-white px-6 py-2 text-sm">
              重试
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-calm-400 py-12">还没有记录</div>
        ) : (
          sessions.map((session) => (
            <SessionCard key={session.id} session={session} guides={guides} />
          ))
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

Modify `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import GuidePage from './pages/GuidePage';
import AIChatPage from './pages/AIChatPage';
import HistoryPage from './pages/HistoryPage';
import DebugPage from './pages/DebugPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/guide/:slug" element={<GuidePage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/debug" element={<DebugPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 3: Add link to HomePage**

Add to `frontend/src/pages/HomePage.tsx`, after the guides list (before closing `</Layout>`):

```tsx
{/* History link */}
<div className="text-center pt-4">
  <Link to="/history" className="text-calm-400 text-sm hover:text-calm-600 transition-colors">
    查看历史
  </Link>
</div>
```

- [ ] **Step 4: Verify build passes**

Run: `cd ~/pills/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/HistoryPage.tsx frontend/src/App.tsx frontend/src/pages/HomePage.tsx
git commit -m "feat: add history page with session list"
```

---

### Task 7: Final Verification

**Files:** All files from previous tasks

- [ ] **Step 1: Run all backend tests**

Run: `cd ~/pills && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Run all frontend tests**

Run: `cd ~/pills/frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Build frontend**

Run: `cd ~/pills/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 5: Tag release**

```bash
git tag -f 0712
git push origin 0712 -f
```
