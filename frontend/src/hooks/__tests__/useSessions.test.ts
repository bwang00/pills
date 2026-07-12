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
