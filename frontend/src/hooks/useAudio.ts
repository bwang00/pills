import { useRef, useCallback, useEffect } from 'react';
import { setSharedAudioCtx } from './useSpeech';
import promptMap from '../../public/audio/prompts/prompt-map.json';

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
const PROMPT_BASE_URL = '/audio/prompts/';
const PROMPT_VOL = 0.8;

const OCEAN_MUSIC_URL = '/audio/ambient-ocean.wav';
const OCEAN_MUSIC_VOL = 0.25;

const VOICE_FILES: Record<string, string> = {
  inhale:  '/audio/voice-inhale.mp3',
  hold:    '/audio/voice-hold.mp3',
  exhale:  '/audio/voice-exhale.mp3',
  start:   '/audio/voice-start.mp3',
  finish:  '/audio/voice-finish.mp3',
};

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const bgSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgGainRef = useRef<GainNode | null>(null);
  const promptSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const oceanSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const oceanGainRef = useRef<GainNode | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { bgSourceRef.current?.stop(); } catch {}
      try { promptSourceRef.current?.stop(); } catch {}
      try { oceanSourceRef.current?.stop(); } catch {}
      bgSourceRef.current = null;
      promptSourceRef.current = null;
      oceanSourceRef.current = null;
      oceanGainRef.current = null;
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

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

  const playPromptAudio = useCallback(async (promptText: string) => {
    if (!promptText) return;
    try {
      const filename = (promptMap as Record<string, string>)[promptText];
      if (!filename) {
        console.warn('[Audio] No audio file for prompt:', promptText);
        return;
      }

      const ctx = await getCtx();

      // Stop any currently playing prompt
      if (promptSourceRef.current) {
        try { promptSourceRef.current.stop(); } catch {}
        promptSourceRef.current = null;
      }

      const url = PROMPT_BASE_URL + filename;
      const buffer = await loadBuffer(ctx, url);

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(PROMPT_VOL, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);

      promptSourceRef.current = source;

      // Lower bg music volume while prompt plays, then restore
      if (bgGainRef.current && ctxRef.current) {
        const now = ctxRef.current.currentTime;
        bgGainRef.current.gain.cancelScheduledValues(now);
        bgGainRef.current.gain.setValueAtTime(bgGainRef.current.gain.value, now);
        bgGainRef.current.gain.linearRampToValueAtTime(0.08, now + 0.5);
        // Restore after prompt finishes
        const restoreTime = now + buffer.duration + 0.5;
        bgGainRef.current.gain.linearRampToValueAtTime(BG_MUSIC_VOL, restoreTime);
      }
    } catch (e) {
      console.warn('[Audio] playPromptAudio failed:', promptText, e);
    }
  }, [getCtx, loadBuffer]);

  const playVoice = useCallback(async (voice: string) => {
    const url = VOICE_FILES[voice];
    if (!url) return;
    try {
      const ctx = await getCtx();

      // Stop any currently playing prompt voice
      if (promptSourceRef.current) {
        try { promptSourceRef.current.stop(); } catch {}
        promptSourceRef.current = null;
      }

      const buffer = await loadBuffer(ctx, url);
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(PROMPT_VOL, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
      promptSourceRef.current = source;

      // Duck bg music while voice plays, then restore
      if (bgGainRef.current && ctxRef.current) {
        const now = ctxRef.current.currentTime;
        bgGainRef.current.gain.cancelScheduledValues(now);
        bgGainRef.current.gain.setValueAtTime(bgGainRef.current.gain.value, now);
        bgGainRef.current.gain.linearRampToValueAtTime(0.08, now + 0.3);
        const restoreTime = now + buffer.duration + 0.3;
        bgGainRef.current.gain.linearRampToValueAtTime(BG_MUSIC_VOL, restoreTime);
      }
    } catch (e) {
      console.warn('[Audio] playVoice failed:', voice, e);
    }
  }, [getCtx, loadBuffer]);

  const startOceanMusic = useCallback(async () => {
    try {
      const ctx = await getCtx();
      if (oceanSourceRef.current) {
        try { oceanSourceRef.current.stop(); } catch {}
        oceanSourceRef.current = null;
      }
      const buffer = await loadBuffer(ctx, OCEAN_MUSIC_URL);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(OCEAN_MUSIC_VOL, now + 3);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
      oceanSourceRef.current = source;
      oceanGainRef.current = gain;
    } catch (e) {
      console.warn('[Audio] startOceanMusic failed:', e);
    }
  }, [getCtx, loadBuffer]);

  const stopOceanMusic = useCallback(() => {
    const ctx = ctxRef.current;
    const gain = oceanGainRef.current;
    const source = oceanSourceRef.current;
    if (ctx && source && gain) {
      try {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 2);
        source.stop(now + 2.1);
      } catch {}
    }
    oceanSourceRef.current = null;
    oceanGainRef.current = null;
  }, []);

  const playMrVoice = useCallback(async (phase: 'tense' | 'relax', bodyPart: string) => {
    const url = `/audio/voice-mr-${phase}-${bodyPart}.mp3`;
    try {
      const ctx = await getCtx();
      if (promptSourceRef.current) {
        try { promptSourceRef.current.stop(); } catch {}
        promptSourceRef.current = null;
      }
      const buffer = await loadBuffer(ctx, url);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(PROMPT_VOL, ctx.currentTime);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
      promptSourceRef.current = source;
      // Duck ocean music while voice plays
      if (oceanGainRef.current && ctxRef.current) {
        const now = ctxRef.current.currentTime;
        oceanGainRef.current.gain.cancelScheduledValues(now);
        oceanGainRef.current.gain.setValueAtTime(oceanGainRef.current.gain.value, now);
        oceanGainRef.current.gain.linearRampToValueAtTime(0.08, now + 0.3);
        const restoreTime = now + buffer.duration + 0.3;
        oceanGainRef.current.gain.linearRampToValueAtTime(OCEAN_MUSIC_VOL, restoreTime);
      }
    } catch (e) {
      console.warn('[Audio] playMrVoice failed:', phase, bodyPart, e);
    }
  }, [getCtx, loadBuffer]);

  const unlockAudio = useCallback(async () => {
    await getCtx();
  }, [getCtx]);

  return { playTone, playBell, unlockAudio, startBgMusic, stopBgMusic, playPromptAudio, playVoice, startOceanMusic, stopOceanMusic, playMrVoice };
}
