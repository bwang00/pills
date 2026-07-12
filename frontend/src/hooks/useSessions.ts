import { useState, useEffect, useCallback } from 'react';

interface Session {
  id: string;
  guide_slug: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

interface UseSessionsReturn {
  sessions: Session[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}

export function useSessions(limit = 50, offset = 0): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const retry = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/sessions?limit=${limit}&offset=${offset}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setSessions(data.sessions || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [limit, offset, refreshKey]);

  return { sessions, loading, error, retry };
}
