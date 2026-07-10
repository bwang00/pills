import { useState, useRef, useCallback, useEffect } from 'react';
import type { GuidePhase } from '../types';

export type BreathingState = 'idle' | 'running' | 'paused' | 'completed';

export function useBreathing(phases: GuidePhase[]) {
  const [state, setState] = useState<BreathingState>('idle');
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use refs for values read inside the interval callback (avoids stale closures)
  const timeRef = useRef(0);
  const phaseRef = useRef(0);
  const roundRef = useRef(1);

  const phaseDuration = phases[currentPhaseIndex]?.duration || 4;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // Tick: decrement time, advance phase when time hits 0
  const tick = useCallback(() => {
    timeRef.current -= 1;

    if (timeRef.current <= 0) {
      // Current phase finished — advance to next
      const nextPhase = phaseRef.current + 1;
      if (nextPhase >= phases.length) {
        // All phases done — loop to next round
        roundRef.current += 1;
        phaseRef.current = 0;
        const dur = phases[0]?.duration || 4;
        timeRef.current = dur;
        setCurrentRound(roundRef.current);
        setCurrentPhaseIndex(0);
        setTimeRemaining(dur);
      } else {
        phaseRef.current = nextPhase;
        const dur = phases[nextPhase]?.duration || 4;
        timeRef.current = dur;
        setCurrentPhaseIndex(nextPhase);
        setTimeRemaining(dur);
      }
    } else {
      setTimeRemaining(timeRef.current);
    }
  }, [phases]);

  useEffect(() => { setProgress(1 - timeRemaining / phaseDuration); }, [timeRemaining, phaseDuration]);

  const start = useCallback(() => {
    const dur = phases[0]?.duration || 4;
    phaseRef.current = 0;
    roundRef.current = 1;
    timeRef.current = dur;
    setCurrentPhaseIndex(0);
    setCurrentRound(1);
    setTimeRemaining(dur);
    setState('running');
    clearTimer();
    intervalRef.current = setInterval(tick, 1000);
  }, [phases, tick, clearTimer]);

  // Restart interval when state changes to running (e.g. after resume)
  useEffect(() => {
    if (state === 'running') {
      clearTimer();
      intervalRef.current = setInterval(tick, 1000);
    }
    return clearTimer;
  }, [state, tick, clearTimer]);

  const pause = useCallback(() => { setState('paused'); clearTimer(); }, [clearTimer]);
  const resume = useCallback(() => { setState('running'); }, []);
  const stop = useCallback(() => {
    setState('idle'); setCurrentPhaseIndex(0); setCurrentRound(1);
    setTimeRemaining(0); setProgress(0); clearTimer();
    phaseRef.current = 0; roundRef.current = 1; timeRef.current = 0;
  }, [clearTimer]);
  const finish = useCallback(() => {
    setState('completed'); clearTimer();
  }, [clearTimer]);

  return { state, currentPhaseIndex, timeRemaining, currentRound, progress, start, pause, resume, stop, finish };
}
