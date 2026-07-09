import { useState, useCallback } from 'react';
import type { GroundingStep, SessionNote } from '../types';

export type GroundingState = 'idle' | 'running' | 'completed';

export function useGrounding(steps: GroundingStep[]) {
  const [state, setState] = useState<GroundingState>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const currentStep = steps[currentStepIndex];

  const start = useCallback(() => {
    setState('running'); setCurrentStepIndex(0); setEntryCount(0); setNotes([]); setCurrentInput('');
  }, []);

  const addEntry = useCallback(() => {
    if (!currentInput.trim()) return;
    setNotes((prev) => [...prev, { step: currentStepIndex, text: currentInput.trim() }]);
    setCurrentInput('');
    const newCount = entryCount + 1;
    setEntryCount(newCount);
    if (newCount >= currentStep.count) {
      if (currentStepIndex + 1 >= steps.length) { setState('completed'); }
      else { setCurrentStepIndex((i) => i + 1); setEntryCount(0); }
    }
  }, [currentInput, currentStepIndex, entryCount, currentStep, steps]);

  const skipStep = useCallback(() => {
    if (currentStepIndex + 1 >= steps.length) { setState('completed'); }
    else { setCurrentStepIndex((i) => i + 1); setEntryCount(0); setCurrentInput(''); }
  }, [currentStepIndex, steps.length]);

  const stop = useCallback(() => {
    setState('idle'); setCurrentStepIndex(0); setEntryCount(0); setNotes([]); setCurrentInput('');
  }, []);

  return { state, currentStepIndex, entryCount, notes, currentInput, start, setInput: setCurrentInput, addEntry, skipStep, stop };
}
