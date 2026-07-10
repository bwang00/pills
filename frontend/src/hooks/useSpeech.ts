import { useRef, useCallback, useState } from 'react';

// Simple cache to avoid regenerating audio for repeated text
const cache = new Map<string, string>();

// Global unlocked AudioContext shared with useAudio
let sharedCtx: AudioContext | null = null;
export function setSharedAudioCtx(ctx: AudioContext) {
  sharedCtx = ctx;
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    stop();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let audioB64 = cache.get(text);

      if (!audioB64) {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (data.error) { console.warn('[TTS]', data.error); return; }
        if (!data.audio_data) { console.warn('[TTS] No audio'); return; }
        audioB64 = data.audio_data as string;
        // Cache (keep max 20 entries)
        if (cache.size > 20) {
          const first = cache.keys().next().value;
          if (first) cache.delete(first);
        }
        cache.set(text, audioB64);
      }

      if (controller.signal.aborted || !audioB64) return;

      // Decode base64 to ArrayBuffer
      const binary = atob(audioB64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      // Play through AudioContext (already unlocked by user gesture on start click)
      if (!sharedCtx) {
        console.warn('[TTS] No AudioContext available');
        return;
      }
      if (sharedCtx.state === 'suspended') {
        await sharedCtx.resume();
      }

      const audioBuffer = await sharedCtx.decodeAudioData(bytes.buffer);
      const source = sharedCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(sharedCtx.destination);

      source.onended = () => {
        setSpeaking(false);
        sourceRef.current = null;
      };

      sourceRef.current = source;
      setSpeaking(true);
      source.start(0);
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name !== 'AbortError') {
        console.warn('[TTS]', e?.message || err);
      }
      setSpeaking(false);
    }
  }, [stop]);

  return { speak, stop, speaking };
}
