import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { useMeditation } from '../hooks/useMeditation';
import type { Guide, MindfulnessConfig } from '../types';

export default function MindfulnessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace('/guide/', '');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const config = guide ? (guide.config as MindfulnessConfig) : { duration_minutes: 5, prompts: [] };
  const { state, elapsed, totalSeconds, currentPrompt, promptOpacity, start, stop } = useMeditation(config.duration_minutes || 5, config.prompts || []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/guides?slug=${slug}`).then((r) => r.json()).then((data) => {
      const g = Array.isArray(data) ? data[0] : data;
      if (g) setGuide(g);
    }).catch(() => {
      setGuide({ id: 'fallback', slug, title: '正念冥想', description: '', category: 'mindfulness',
        config: { duration_minutes: 5, prompts: [{ time_pct: 0, text: '闭上眼睛，关注呼吸' }] }, sort_order: 0 });
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
        body: JSON.stringify({ completed_at: new Date().toISOString(), duration_seconds: totalSeconds }) }).catch(() => {});
    }
  }, [state, sessionId, totalSeconds]);

  if (!guide) return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const progressPct = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;

  return (
    <Layout title={guide.title}>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>

      {state === 'idle' && (
        <div className="text-center py-12">
          <p className="text-calm-600 mb-6">找一个舒适的姿势，准备好后开始。<br />时长：{config.duration_minutes} 分钟</p>
          <button onClick={handleStart} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">开始冥想</button>
        </div>
      )}

      {state === 'running' && (
        <div className="text-center py-8">
          <motion.div
            className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-calm-200 to-calm-400 flex items-center justify-center shadow-lg"
            animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="text-center text-white">
              <p className="text-3xl font-light">{minutes}:{seconds.toString().padStart(2, '0')}</p>
            </div>
          </motion.div>

          <div className="w-full bg-calm-100 rounded-full h-1 mt-8 mb-6 max-w-xs mx-auto">
            <div className="bg-calm-300 h-1 rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
          </div>

          <motion.p
            className="text-calm-600 text-lg mb-8 min-h-[2em] max-w-xs mx-auto leading-relaxed"
            animate={{ opacity: promptOpacity }}
            transition={{ duration: 0.8 }}
          >
            {currentPrompt}
          </motion.p>

          <button onClick={stop} className="text-calm-400 text-sm hover:text-calm-600 transition-colors">结束冥想</button>
        </div>
      )}

      {state === 'completed' && (
        <div className="text-center py-12">
          <p className="text-calm-600 text-xl mb-2">做得很好 ✨</p>
          <p className="text-calm-400 text-sm mb-2">你完成了 {config.duration_minutes} 分钟的正念冥想。</p>
          <p className="text-calm-400 text-sm mb-6">希望你现在感觉更平静了。</p>
          <button onClick={() => navigate('/')} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">返回首页</button>
        </div>
      )}
    </Layout>
  );
}
