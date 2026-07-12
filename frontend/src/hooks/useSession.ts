import { useState, useCallback, useRef } from 'react';

export function useSession(guideSlug: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const startSession = useCallback(async () => {
    startTimeRef.current = Date.now();
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide_slug: guideSlug }),
      });
      const data = await res.json();
      setSessionId(data.id);
    } catch {
      // Silent failure — don't block guide experience
    }
  }, [guideSlug]);

  const completeSession = useCallback(() => {
    if (!sessionId) return;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    fetch(`/api/sessions?id=${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      }),
    }).catch(() => {
      // Silent failure
    });
  }, [sessionId]);

  return { sessionId, startSession, completeSession };
}
