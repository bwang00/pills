import { useState, useRef, useCallback, useEffect } from 'react';
import type { GuidePhase } from '../types';

export type BreathingState = 'idle' | 'running' | 'paused' | 'completed';

export function useBreathing(phases: GuidePhase[], rounds: number = 4) {
  const [state, setState] = useState<BreathingState>('idle');
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseDuration = phases[currentPhaseIndex]?.duration || 4;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const advancePhase = useCallback(() => {
    setCurrentPhaseIndex((pi) => {
      const next = pi + 1;
      if (next >= phases.length) {
        // Infinite loop: increment round, never complete
        setCurrentRound((r) => r + 1);
        setTimeRemaining(phases[0]?.duration || 4);
        return 0;
      }
      setTimeRemaining(phases[next]?.duration || 4);
      return next;
    });
  }, [phases, clearTimer]);

  useEffect(() => { setProgress(1 - timeRemaining / phaseDuration); }, [timeRemaining, phaseDuration]);

  const start = useCallback(() => {
    setState('running');
    setCurrentPhaseIndex(0);
    setCurrentRound(1);
    setTimeRemaining(phases[0]?.duration || 4);
    clearTimer();
    intervalRef.current = setInterval(advancePhase, 1000);
  }, [phases, advancePhase, clearTimer]);

  // Re-set interval when advancePhase changes (phase/round updates)
  useEffect(() => {
    if (state === 'running') {
      clearTimer();
      intervalRef.current = setInterval(advancePhase, 1000);
    }
    return clearTimer;
  }, [advancePhase, state, clearTimer]);

  const pause = useCallback(() => { setState('paused'); clearTimer(); }, [clearTimer]);
  const resume = useCallback(() => { setState('running'); }, []);
  const stop = useCallback(() => {
    setState('idle'); setCurrentPhaseIndex(0); setCurrentRound(1);
    setTimeRemaining(0); setProgress(0); clearTimer();
  }, [clearTimer]);
  const finish = useCallback(() => {
    setState('completed'); clearTimer();
  }, [clearTimer]);

  return { state, currentPhaseIndex, timeRemaining, totalRounds: rounds, currentRound, progress, start, pause, resume, stop, finish };
}
