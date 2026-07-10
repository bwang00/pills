import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreathing } from '../useBreathing';

// Use duration:1 so each 1s interval tick = exactly 1 phase advance
const phases = [
  { name: '吸气', duration: 1 },
  { name: '屏息', duration: 1 },
  { name: '呼气', duration: 1 },
];

describe('useBreathing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('starts in idle state', () => {
    const { result } = renderHook(() => useBreathing(phases, 1));
    expect(result.current.state).toBe('idle');
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.currentRound).toBe(1);
  });

  test('transitions to running on start', () => {
    const { result } = renderHook(() => useBreathing(phases, 1));
    act(() => result.current.start());
    expect(result.current.state).toBe('running');
    expect(result.current.currentPhaseIndex).toBe(0);
    expect(result.current.timeRemaining).toBe(1);
  });

  test('advances phase after each tick', () => {
    const { result } = renderHook(() => useBreathing(phases, 1));
    act(() => result.current.start());
    expect(result.current.currentPhaseIndex).toBe(0);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.currentPhaseIndex).toBe(1);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.currentPhaseIndex).toBe(2);
  });

  test('completes after all phases in one round', () => {
    const { result } = renderHook(() => useBreathing(phases, 1));
    act(() => result.current.start());

    // 3 phases x 1s tick = 3s
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.state).toBe('completed');
  });

  test('handles multiple rounds', () => {
    const { result } = renderHook(() => useBreathing(phases, 2));
    act(() => result.current.start());

    // First round: 3 phases x 1s = 3s → moves to round 2
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.state).toBe('running');
    expect(result.current.currentRound).toBe(2);
    expect(result.current.currentPhaseIndex).toBe(0);

    // Second round: another 3s → completed
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.state).toBe('completed');
  });

  test('pause and resume', () => {
    const { result } = renderHook(() => useBreathing(phases, 1));
    act(() => result.current.start());
    act(() => result.current.pause());
    expect(result.current.state).toBe('paused');

    // Timer should not advance while paused
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.state).toBe('paused');

    act(() => result.current.resume());
    expect(result.current.state).toBe('running');
  });

  test('stop resets to idle', () => {
    const { result } = renderHook(() => useBreathing(phases, 1));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => result.current.stop());
    expect(result.current.state).toBe('idle');
    expect(result.current.currentPhaseIndex).toBe(0);
    expect(result.current.currentRound).toBe(1);
    expect(result.current.timeRemaining).toBe(0);
  });
});
