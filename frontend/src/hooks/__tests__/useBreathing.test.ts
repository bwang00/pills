import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreathing } from '../useBreathing';

// Use duration:1 so each 1s interval tick = exactly 1 phase advance
const phases = [
  { name: '吸气', duration: 1 },
  { name: '闭气', duration: 1 },
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
    const { result } = renderHook(() => useBreathing(phases));
    expect(result.current.state).toBe('idle');
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.currentRound).toBe(1);
  });

  test('transitions to running on start', () => {
    const { result } = renderHook(() => useBreathing(phases));
    act(() => result.current.start());
    expect(result.current.state).toBe('running');
    expect(result.current.currentPhaseIndex).toBe(0);
    expect(result.current.timeRemaining).toBe(1);
  });

  test('counts down then advances phase', () => {
    const phases2 = [
      { name: '吸气', duration: 3 },
      { name: '闭气', duration: 2 },
    ];
    const { result } = renderHook(() => useBreathing(phases2));
    act(() => result.current.start());
    expect(result.current.timeRemaining).toBe(3);
    expect(result.current.currentPhaseIndex).toBe(0);

    // After 1s: 2 remaining
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.timeRemaining).toBe(2);
    expect(result.current.currentPhaseIndex).toBe(0);

    // After 2s: 1 remaining
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.timeRemaining).toBe(1);
    expect(result.current.currentPhaseIndex).toBe(0);

    // After 3s: phase advances
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.currentPhaseIndex).toBe(1);
    expect(result.current.timeRemaining).toBe(2);
  });

  test('loops to next round after all phases', () => {
    const { result } = renderHook(() => useBreathing(phases));
    act(() => result.current.start());

    // 3 phases x 1s = 3s → loops to round 2
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.state).toBe('running');
    expect(result.current.currentRound).toBe(2);
    expect(result.current.currentPhaseIndex).toBe(0);
  });

  test('pause and resume', () => {
    const { result } = renderHook(() => useBreathing(phases));
    act(() => result.current.start());
    act(() => result.current.pause());
    expect(result.current.state).toBe('paused');

    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.state).toBe('paused');

    act(() => result.current.resume());
    expect(result.current.state).toBe('running');
  });

  test('stop resets to idle', () => {
    const { result } = renderHook(() => useBreathing(phases));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => result.current.stop());
    expect(result.current.state).toBe('idle');
    expect(result.current.currentPhaseIndex).toBe(0);
    expect(result.current.currentRound).toBe(1);
    expect(result.current.timeRemaining).toBe(0);
  });

  test('finish transitions to completed', () => {
    const { result } = renderHook(() => useBreathing(phases));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => result.current.finish());
    expect(result.current.state).toBe('completed');
  });
});
