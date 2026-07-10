import { useRef, useCallback } from 'react';
import { setSharedAudioCtx } from './useSpeech';

type ToneType = 'inhale' | 'hold' | 'exhale' | 'transition' | 'bell';

const TONE_FILES: Record<ToneType, string> = {
  inhale:     '/audio/inhale.wav',
  hold:       '/audio/hold.wav',
  exhale:     '/audio/exhale.wav',
  transition: '/audio/transition.wav',
  bell:       '/audio/bell.wav',
};

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());

  const getCtx = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    setSharedAudioCtx(ctxRef.current);
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const loadBuffer = useCallback(async (ctx: AudioContext, url: string): Promise<AudioBuffer> => {
    const cached = bufferCache.current.get(url);
    if (cached) return cached;
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    bufferCache.current.set(url, audioBuf);
    return audioBuf;
  }, []);

  const playTone = useCallback(async (tone: ToneType, volume = 0.6) => {
    try {
      const ctx = await getCtx();
      const url = TONE_FILES[tone];
      const buffer = await loadBuffer(ctx, url);

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
    } catch (e) {
      console.warn('[Audio] playTone failed:', tone, e);
    }
  }, [getCtx, loadBuffer]);

  const playBell = useCallback(() => playTone('bell', 0.5), [playTone]);

  const unlockAudio = useCallback(async () => {
    await getCtx();
  }, [getCtx]);

  return { playTone, playBell, unlockAudio };
}
