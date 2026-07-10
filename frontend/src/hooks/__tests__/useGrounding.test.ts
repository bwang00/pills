import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGrounding } from '../useGrounding';

const steps = [
  { sense: '看', count: 2, prompt: '说出你能看到的2样东西' },
  { sense: '听', count: 1, prompt: '说出你能听到的1种声音' },
];

describe('useGrounding', () => {
  test('starts in idle state', () => {
    const { result } = renderHook(() => useGrounding(steps));
    expect(result.current.state).toBe('idle');
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.notes).toEqual([]);
  });

  test('transitions to running on start', () => {
    const { result } = renderHook(() => useGrounding(steps));
    act(() => result.current.start());
    expect(result.current.state).toBe('running');
    expect(result.current.entryCount).toBe(0);
    expect(result.current.currentInput).toBe('');
  });

  test('records entry and tracks count', () => {
    const { result } = renderHook(() => useGrounding(steps));
    act(() => result.current.start());
    act(() => result.current.setInput('天空'));
    act(() => result.current.addEntry());
    expect(result.current.entryCount).toBe(1);
    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0]).toEqual({ step: 0, text: '天空' });
    expect(result.current.currentInput).toBe('');
  });

  test('ignores empty input', () => {
    const { result } = renderHook(() => useGrounding(steps));
    act(() => result.current.start());
    act(() => result.current.setInput('   '));
    act(() => result.current.addEntry());
    expect(result.current.entryCount).toBe(0);
    expect(result.current.notes).toHaveLength(0);
  });

  test('advances to next step when entries are complete', () => {
    const { result } = renderHook(() => useGrounding(steps));
    act(() => result.current.start());
    act(() => result.current.setInput('天空'));
    act(() => result.current.addEntry());
    act(() => result.current.setInput('树'));
    act(() => result.current.addEntry());
    // Should now be on step 2 (index 1)
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
    expect(result.current.notes).toHaveLength(3);
  });

  test('skip moves to next step', () => {
    const { result } = renderHook(() => useGrounding(steps));
    act(() => result.current.start());
    act(() => result.current.skipStep());
    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.state).toBe('running');
  });

  test('skip on last step completes', () => {
    const { result } = renderHook(() => useGrounding(steps));
    act(() => result.current.start());
    act(() => result.current.skipStep());
    act(() => result.current.skipStep());
    expect(result.current.state).toBe('completed');
  });

  test('stop resets to idle', () => {
    const { result } = renderHook(() => useGrounding(steps));
    act(() => result.current.start());
    act(() => result.current.setInput('test'));
    act(() => result.current.addEntry());
    act(() => result.current.stop());
    expect(result.current.state).toBe('idle');
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.entryCount).toBe(0);
    expect(result.current.notes).toEqual([]);
    expect(result.current.currentInput).toBe('');
  });
});
