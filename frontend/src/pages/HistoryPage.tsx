import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import SessionCard from '../components/SessionCard';
import { useSessions } from '../hooks/useSessions';
import type { Guide } from '../types';

export default function HistoryPage() {
  const { sessions, loading, error, retry } = useSessions();
  const [guides, setGuides] = useState<Guide[]>([]);

  useEffect(() => {
    fetch('/api/guides')
      .then((res) => res.json())
      .then((data) => setGuides(Array.isArray(data) ? data : []))
      .catch(() => setGuides([]));
  }, []);

  return (
    <Layout title="历史记录">
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-calm-400 py-12">加载中…</div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-calm-400 mb-4">加载失败，请稍后再试</p>
            <button onClick={retry} className="rounded-full bg-calm-500 text-white px-6 py-2 text-sm">
              重试
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-calm-400 py-12">还没有记录</div>
        ) : (
          sessions.map((session) => (
            <SessionCard key={session.id} session={session} guides={guides} />
          ))
        )}
      </div>
    </Layout>
  );
}
