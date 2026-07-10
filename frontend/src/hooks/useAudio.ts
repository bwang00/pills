import { useRef, useCallback } from 'react';
import { setSharedAudioCtx } from './useSpeech';

type ToneType = 'inhale' | 'hold' | 'exhale' | 'transition' | 'bell';

const TONE_MAP: Record<ToneType, { freq: number; duration: number; type: OscillatorType }> = {
  inhale:     { freq: 396, duration: 0.3, type: 'sine' },
  hold:       { freq: 528, duration: 0.3, type: 'sine' },
  exhale:     { freq: 285, duration: 0.5, type: 'sine' },
  transition: { freq: 440, duration: 0.2, type: 'triangle' },
  bell:       { freq: 660, duration: 0.8, type: 'sine' },
};

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Share with useSpeech for TTS playback
    setSharedAudioCtx(ctxRef.current);
    // Resume if suspended (browsers require user gesture to start audio)
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(async (tone: ToneType, volume = 0.15) => {
    try {
      const ctx = await getCtx();
      const { freq, duration, type } = TONE_MAP[tone];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not available
    }
  }, [getCtx]);

  const playBell = useCallback(() => { playTone('bell', 0.12); }, [playTone]);

  return { playTone, playBell };
}
