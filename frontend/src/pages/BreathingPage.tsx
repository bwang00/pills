import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import BreathingCircle from '../components/BreathingCircle';
import { useBreathing } from '../hooks/useBreathing';
import type { Guide, BreathingConfig } from '../types';

export default function BreathingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [rounds, setRounds] = useState(4);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const phases = (guide?.config as BreathingConfig)?.phases || [];
  const { state, currentPhaseIndex, timeRemaining, progress, currentRound, start, pause, resume, stop } = useBreathing(phases, rounds);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/guides?slug=${slug}`).then((r) => r.json()).then((data) => {
      const g = Array.isArray(data) ? data[0] : data;
      if (g) setGuide(g);
    }).catch(() => {
      setGuide({ id: 'fallback', slug, title: '呼吸引导', description: '', category: 'breathing',
        config: { phases: [{ name: '吸气', duration: 4 }, { name: '屏息', duration: 7 }, { name: '呼气', duration: 8 }] }, sort_order: 0 });
    });
  }, [slug]);

  const handleStart = async () => {
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guide_slug: slug }) });
      const data = await res.json(); setSessionId(data.id);
    } catch { /* non-critical */ }
    start();
  };

  useEffect(() => {
    if (state === 'completed' && sessionId) {
      fetch(`/api/sessions?id=${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date().toISOString(), duration_seconds: rounds * phases.reduce((s, p) => s + p.duration, 0) })
      }).catch(() => {});
    }
  }, [state, sessionId]);

  if (!guide) return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;
  const phaseName = phases[currentPhaseIndex]?.name || '';

  return (
    <Layout title={guide.title}>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>
      <BreathingCircle state={state} phaseName={phaseName} progress={progress} timeRemaining={timeRemaining} />
      {state === 'running' && <p className="text-center text-calm-500 text-sm mb-4">第 {currentRound} / {rounds} 轮</p>}
      <div className="flex justify-center gap-4 mt-6">
        {state === 'idle' && (
          <>
            <select className="rounded-lg border border-calm-200 px-3 py-2 text-calm-700 bg-white" value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
              {[2, 4, 6, 8].map((n) => <option key={n} value={n}>{n} 轮</option>)}
            </select>
            <button onClick={handleStart} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">开始</button>
          </>
        )}
        {state === 'running' && (
          <>
            <button onClick={pause} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">暂停</button>
            <button onClick={stop} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">结束</button>
          </>
        )}
        {state === 'paused' && (
          <>
            <button onClick={resume} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">继续</button>
            <button onClick={stop} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">结束</button>
          </>
        )}
        {state === 'completed' && (
          <div className="text-center">
            <p className="text-calm-600 text-lg mb-4">做得很好 ✨</p>
            <button onClick={() => navigate('/')} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">返回首页</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
