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

const BG_MUSIC_URL = '/audio/ambient-bg.wav';
const BG_MUSIC_VOL = 0.25;

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const bgSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgGainRef = useRef<GainNode | null>(null);

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

  const startBgMusic = useCallback(async (url?: string) => {
    try {
      const ctx = await getCtx();
      // Stop any existing bg music
      if (bgSourceRef.current) {
        try { bgSourceRef.current.stop(); } catch {}
        bgSourceRef.current = null;
      }

      const buffer = await loadBuffer(ctx, url || BG_MUSIC_URL);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      // Fade in over 3 seconds
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(BG_MUSIC_VOL, now + 3);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);

      bgSourceRef.current = source;
      bgGainRef.current = gain;
    } catch (e) {
      console.warn('[Audio] startBgMusic failed:', e);
    }
  }, [getCtx, loadBuffer]);

  const stopBgMusic = useCallback(() => {
    const ctx = ctxRef.current;
    const gain = bgGainRef.current;
    const source = bgSourceRef.current;
    if (ctx && source && gain) {
      try {
        // Fade out over 2 seconds
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 2);
        source.stop(now + 2.1);
      } catch {}
    }
    bgSourceRef.current = null;
    bgGainRef.current = null;
  }, []);

  const unlockAudio = useCallback(async () => {
    await getCtx();
  }, [getCtx]);

  return { playTone, playBell, unlockAudio, startBgMusic, stopBgMusic };
}
