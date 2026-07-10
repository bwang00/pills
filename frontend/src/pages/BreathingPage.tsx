import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { useBreathing } from '../hooks/useBreathing';
import type { Guide, BreathingConfig } from '../types';

export default function BreathingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace('/guide/', '');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const phases = (guide?.config as BreathingConfig)?.phases || [];
  const { state, currentPhaseIndex, timeRemaining, progress, currentRound, totalRounds, start, pause, resume, stop } = useBreathing(phases, 4);

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
    } catch {}
    start();
  };

  useEffect(() => {
    if (state === 'completed' && sessionId) {
      fetch(`/api/sessions?id=${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date().toISOString(), duration_seconds: totalRounds * phases.reduce((s, p) => s + p.duration, 0) }) }).catch(() => {});
    }
  }, [state, sessionId, totalRounds, phases]);

  if (!guide) return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;
  const phaseName = phases[currentPhaseIndex]?.name || '';

  return (
    <Layout title={guide.title}>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>

      {state === 'idle' && (
        <div className="text-center py-12">
          <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-calm-200 to-calm-400 flex items-center justify-center shadow-lg mb-6">
            <p className="text-xl text-white">准备好了吗？</p>
          </div>
          <button onClick={handleStart} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">开始</button>
        </div>
      )}

      {state === 'running' && (
        <div className="text-center py-8">
          <p className="text-calm-400 text-sm mb-4">第 {currentRound} / {totalRounds} 轮</p>
          <motion.div
            className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-calm-300 to-calm-500 flex items-center justify-center shadow-lg"
            animate={{ scale: phaseName === '吸气' ? 1 + progress * 0.5 : phaseName === '呼气' ? 1.5 - progress * 0.5 : 1.25 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="text-center text-white">
              <p className="text-2xl font-semibold">{phaseName}</p>
              <p className="text-4xl font-light mt-1">{timeRemaining}</p>
            </div>
          </motion.div>
          <div className="flex justify-center gap-4 mt-6">
            <button onClick={pause} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">暂停</button>
            <button onClick={stop} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">结束</button>
          </div>
        </div>
      )}

      {state === 'paused' && (
        <div className="text-center py-12">
          <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-calm-200 to-calm-400 flex items-center justify-center shadow-lg mb-6">
            <p className="text-xl text-white">已暂停</p>
          </div>
          <div className="flex justify-center gap-4">
            <button onClick={resume} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">继续</button>
            <button onClick={stop} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">结束</button>
          </div>
        </div>
      )}

      {state === 'completed' && (
        <div className="text-center py-12">
          <p className="text-calm-600 text-xl mb-2">做得很好 ✨</p>
          <p className="text-calm-400 text-sm mb-6">你完成了 {totalRounds} 轮呼吸练习。</p>
          <button onClick={() => navigate('/')} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">返回首页</button>
        </div>
      )}
    </Layout>
  );
}
