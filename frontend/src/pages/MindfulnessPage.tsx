import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import AICoach from '../components/AICoach';
import { useMeditation } from '../hooks/useMeditation';
import { useAudio } from '../hooks/useAudio';
import type { Guide, MindfulnessConfig } from '../types';

const AMBIENT_GRADIENTS = [
  'from-calm-200 to-calm-400',
  'from-blue-200 to-indigo-300',
  'from-teal-200 to-cyan-300',
  'from-violet-200 to-purple-300',
];

export default function MindfulnessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace('/guide/', '');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const { playBell } = useAudio();

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
    setShowIntro(false);
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guide_slug: slug }) });
      const data = await res.json(); setSessionId(data.id);
    } catch {}
    playBell();
    start();
  };

  useEffect(() => {
    if (state === 'completed' && sessionId) {
      fetch(`/api/sessions?id=${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date().toISOString(), duration_seconds: totalSeconds }) }).catch(() => {});
      playBell();
    }
  }, [state, sessionId, totalSeconds, playBell]);

  if (!guide) return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const progressPct = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;
  const gradientIndex = Math.min(Math.floor(progressPct / 25), AMBIENT_GRADIENTS.length - 1);

  return (
    <Layout title={guide.title}>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>

      {/* Intro */}
      {showIntro && state === 'idle' && (
        <div className="py-4">
          <div className="bg-white/60 backdrop-blur rounded-2xl p-6 shadow-sm border border-calm-100 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🧘</span>
              <div>
                <h2 className="font-semibold text-calm-800">正念冥想</h2>
                <p className="text-calm-400 text-xs">{config.duration_minutes} 分钟 · 静坐观照</p>
              </div>
            </div>
            <p className="text-calm-600 text-sm leading-relaxed mb-4">
              正念冥想不是让大脑空白，而是温柔地观察当下的体验。不需要做得"好"或"对"，只需要在这里。屏幕上会定时出现轻柔的提示，帮助你回到当下。
            </p>
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-semibold text-calm-700">准备</h3>
              <div className="grid grid-cols-1 gap-2">
                {['找一个安静、不被打扰的地方', '坐着或躺着，让身体自然放松', '可以闭上眼睛，或微微垂下目光', '不需要改变呼吸，只是观察它'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 bg-calm-50 rounded-lg px-3 py-2">
                    <span className="text-calm-400 text-sm">•</span>
                    <span className="text-calm-600 text-sm">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-calm-50 rounded-xl p-3">
              <p className="text-calm-500 text-xs">🔔 开始和结束时会有轻柔的铃声提示。中途如果思绪飘走，温柔地拉回来就好。</p>
            </div>
          </div>
          <div className="text-center">
            <button onClick={handleStart} className="rounded-full bg-calm-500 text-white px-10 py-4 font-semibold hover:bg-calm-600 transition-colors shadow-md text-lg">
              开始冥想
            </button>
          </div>
        </div>
      )}

      {/* Running — immersive meditation view */}
      {state === 'running' && (
        <div className="text-center py-4">
          {/* Breathing orb */}
          <div className="relative w-56 h-56 mx-auto mb-6">
            {/* Ambient rings */}
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${AMBIENT_GRADIENTS[gradientIndex]} opacity-10`}
                animate={{ scale: [1, 1 + i * 0.12, 1], opacity: [0.08, 0.15, 0.08] }}
                transition={{ duration: 4 + i * 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
              />
            ))}
            <motion.div
              className={`relative w-full h-full rounded-full bg-gradient-to-br ${AMBIENT_GRADIENTS[gradientIndex]} flex items-center justify-center shadow-xl`}
              animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="text-center text-white">
                <p className="text-3xl font-light">{minutes}:{seconds.toString().padStart(2, '0')}</p>
                <p className="text-sm mt-1 opacity-70">/ {config.duration_minutes}:00</p>
              </div>
            </motion.div>
          </div>

          {/* Circular progress */}
          <div className="w-full bg-calm-100 rounded-full h-1 mb-8 max-w-xs mx-auto">
            <motion.div
              className="bg-calm-300 h-1 rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1 }}
            />
          </div>

          {/* Meditation prompt */}
          <motion.p
            className="text-calm-600 text-lg mb-8 min-h-[3em] max-w-xs mx-auto leading-relaxed px-4"
            animate={{ opacity: promptOpacity }}
            transition={{ duration: 1.2 }}
          >
            {currentPrompt}
          </motion.p>

          <button onClick={stop} className="text-calm-400 text-sm hover:text-calm-600 transition-colors">结束冥想</button>
        </div>
      )}

      {state === 'completed' && (
        <div className="text-center py-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, type: 'spring' }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-200 to-violet-400 flex items-center justify-center shadow-lg mb-6"
          >
            <span className="text-4xl">✨</span>
          </motion.div>
          <p className="text-calm-700 text-xl font-semibold mb-2">做得很好</p>
          <p className="text-calm-400 text-sm mb-2">你完成了 {config.duration_minutes} 分钟的正念冥想</p>
          <p className="text-calm-400 text-sm mb-6">带着这份平静，继续你的一天。</p>
          <button onClick={() => navigate('/')} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">返回首页</button>
        </div>
      )}

      <AICoach guideType="mindfulness" currentPhase="meditating" triggerKey={Math.floor(elapsed / 30)} enabled={state === 'running'} />
    </Layout>
  );
}
