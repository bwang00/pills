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
