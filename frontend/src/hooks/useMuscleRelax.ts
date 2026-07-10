import { useState, useRef, useCallback, useEffect } from 'react';

export interface MuscleStep {
  body_part: string;
  tense_duration: number;
  relax_duration: number;
  tense_prompt: string;
  relax_prompt: string;
}

export type MusclePhase = 'idle' | 'tense' | 'relax' | 'transition' | 'completed';

export function useMuscleRelax(steps: MuscleStep[]) {
  const [state, setState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [phase, setPhase] = useState<MusclePhase>('idle');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = steps[currentStepIndex];
  const phaseDuration = phase === 'tense' ? currentStep?.tense_duration : phase === 'relax' ? currentStep?.relax_duration : 0;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const advanceStep = useCallback(() => {
    if (currentStepIndex + 1 >= steps.length) {
      setState('completed'); setPhase('completed'); clearTimer(); return;
    }
    setPhase('transition');
    setTimeRemaining(2);
    setTimeout(() => {
      setCurrentStepIndex((i) => i + 1);
      setPhase('tense');
      setTimeRemaining(steps[currentStepIndex + 1]?.tense_duration || 5);
    }, 2000);
  }, [currentStepIndex, steps, clearTimer]);

  useEffect(() => {
    if (state !== 'running') return;
    if (phase === 'tense' || phase === 'relax') {
      clearTimer();
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (phase === 'tense') {
              setPhase('relax');
              return currentStep?.relax_duration || 10;
            } else {
              advanceStep();
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTimer;
  }, [phase, state, currentStep, advanceStep, clearTimer]);

  useEffect(() => { setProgress(phaseDuration > 0 ? 1 - timeRemaining / phaseDuration : 0); }, [timeRemaining, phaseDuration]);

  const start = useCallback(() => {
    setState('running'); setCurrentStepIndex(0); setPhase('tense');
    setTimeRemaining(steps[0]?.tense_duration || 5);
  }, [steps]);

  const stop = useCallback(() => {
    setState('idle'); setPhase('idle'); setCurrentStepIndex(0);
    setTimeRemaining(0); setProgress(0); clearTimer();
  }, [clearTimer]);

  return { state, currentStepIndex, phase, timeRemaining, progress, start, stop };
}
