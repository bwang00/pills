# Session History — Design Spec

## Overview

Add session tracking and history to Pills. When a user starts a guide, a session is automatically created. When they finish, it's marked complete. A history page displays past sessions as a simple list.

## Requirements

- **Scope:** Full history — dedicated `/history` page showing all past sessions with dates, durations, and guides used
- **Session creation:** Auto on guide start (zero friction)
- **History page:** Separate route at `/history`, linked via text link "查看历史" on home page
- **Display:** Simple list — date, guide name, duration, status

## Architecture

### Backend

- Add `GET /api/sessions?limit=50&offset=0` to existing `sessions.py`
- Returns sessions ordered by `started_at DESC`
- Response shape: `{ sessions: [...], total: number }`
- API designed to be extensible (filters can be added later without breaking interface)

### Frontend

- New `HistoryPage.tsx` at route `/history`
- Text link "查看历史" on `HomePage.tsx`
- Each guide page auto-creates session on start, PATCHes on complete
- Shared `useSession(guideSlug)` hook to avoid duplication across guide pages

### Data Flow

```
User taps "开始" → POST /api/sessions { guide_slug } → store session_id
User taps "结束" or completes → PATCH /api/sessions?id=xxx { completed_at, duration_seconds }
History page → GET /api/sessions → render list
```

## Data Model

No migration needed. Existing `sessions` table has all required fields:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Session identifier |
| guide_slug | text | Which guide was used |
| started_at | timestamptz | When session began |
| completed_at | timestamptz | When session ended (null if in progress) |
| duration_seconds | integer | Total duration |
| notes | jsonb | User notes (for grounding exercises) |

## Frontend Components

### `HistoryPage.tsx`

- Fetches `GET /api/sessions?limit=50&offset=0`
- Renders a list of `SessionCard` components
- Empty state: "还没有记录" message
- Error state: "加载失败，请稍后再试" with retry button

### `SessionCard.tsx`

- Props: `session: { id, guide_slug, started_at, completed_at, duration_seconds }`
- Formats date as "7月12日 11:05"
- Formats duration as "5分钟" or "进行中" if not completed
- Styling consistent with existing `GuideCard`

### `useSessions.ts`

- Hook for fetching sessions with pagination
- Returns `{ sessions, loading, error, retry }`
- Handles loading, success, and error states

### `useSession(guideSlug)`

- Hook for tracking a single session
- `startSession()` — POST to create session, returns session_id
- `completeSession(durationSeconds)` — PATCH to mark complete
- Silent failure — doesn't block guide experience if tracking fails

## Guide Page Integration

Each guide page (`BreathingPage`, `GroundingPage`, `MuscleRelaxPage`, `MindfulnessPage`) uses `useSession(guideSlug)`:

- On "开始" → call `startSession()`
- On "结束" or auto-complete → call `completeSession(durationSeconds)`

## Error Handling

### API

- `GET /api/sessions` returns empty array on error (graceful degradation)
- Invalid `limit`/`offset` params clamp to sensible defaults (limit max 100, offset min 0)

### Frontend

- `useSessions` hook: fetch failure shows error with retry button
- Session creation (POST): silent failure, don't block guide
- Session completion (PATCH): silent failure, log to console only

## Testing

### Backend

- Test `GET /api/sessions` in `tests/test_api_sessions.py`
- Test pagination params (limit/offset)
- Test ordering (newest first)
- Test param validation (limit clamped to 100 max)

### Frontend

- `useSessions` hook test: loading state, success, error
- `SessionCard` test: renders guide title, formats date and duration correctly

## Out of Scope

- Filtering by guide type, date range, or status
- Statistics (total sessions, total time, streaks)
- Charts or visualizations
- User authentication (sessions remain anonymous)

These can be added later via API extensions without breaking the current interface.
