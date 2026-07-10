import { useState, useRef, useCallback, useEffect } from 'react';

export interface MeditationPrompt {
  time_pct: number;
  text: string;
}

export function useMeditation(durationMinutes: number, prompts: MeditationPrompt[]) {
  const [state, setState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [promptOpacity, setPromptOpacity] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSeconds = durationMinutes * 60;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (state !== 'running') return;
    clearTimer();
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= totalSeconds) {
          setState('completed'); clearTimer(); return totalSeconds;
        }
        const newElapsed = prev + 1;
        const pct = (newElapsed / totalSeconds) * 100;
        const activePrompt = [...prompts].reverse().find((p) => p.time_pct <= pct);
        if (activePrompt && activePrompt.text !== currentPrompt) {
          setPromptOpacity(0);
          setTimeout(() => { setCurrentPrompt(activePrompt.text); setPromptOpacity(1); }, 500);
        }
        return newElapsed;
      });
    }, 1000);
    return clearTimer;
  }, [state, totalSeconds, prompts, currentPrompt, clearTimer]);

  const start = useCallback(() => {
    setState('running'); setElapsed(0);
    if (prompts.length > 0) { setCurrentPrompt(prompts[0].text); setPromptOpacity(1); }
  }, [prompts]);

  const stop = useCallback(() => {
    setState('idle'); setElapsed(0); setCurrentPrompt(''); setPromptOpacity(0); clearTimer();
  }, [clearTimer]);

  return { state, elapsed, totalSeconds, currentPrompt, promptOpacity, start, stop };
}
