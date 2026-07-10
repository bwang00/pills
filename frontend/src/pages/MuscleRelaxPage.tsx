import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { useMuscleRelax } from '../hooks/useMuscleRelax';
import type { Guide, MuscleRelaxConfig } from '../types';

const bodyPartEmoji: Record<string, string> = {
  '额头': '🧠', '下巴': '😮', '肩膀': '💪', '手臂': '🤜',
  '腹部': '🫁', '背部': '🔙', '大腿': '🦵', '双脚': '🦶',
};

export default function MuscleRelaxPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace('/guide/', '');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const steps = (guide?.config as MuscleRelaxConfig)?.steps || [];
  const { state, currentStepIndex, phase, timeRemaining, progress, start, stop } = useMuscleRelax(steps);
  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/guides?slug=${slug}`).then((r) => r.json()).then((data) => {
      const g = Array.isArray(data) ? data[0] : data;
      if (g) setGuide(g);
    }).catch(() => {
      setGuide({ id: 'fallback', slug, title: '肌肉放松', description: '', category: 'muscle_relax',
        config: { steps: [{ body_part: '肩膀', tense_duration: 5, relax_duration: 10, tense_prompt: '收紧肩膀', relax_prompt: '放松肩膀' }] }, sort_order: 0 });
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
        body: JSON.stringify({ completed_at: new Date().toISOString() }) }).catch(() => {});
    }
  }, [state, sessionId]);

  if (!guide) return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;

  return (
    <Layout title={guide.title}>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>

      {state === 'idle' && (
        <div className="text-center py-12">
          <p className="text-calm-600 mb-6">逐步收紧和放松身体各部位肌肉。<br />跟着提示做就好。</p>
          <button onClick={handleStart} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">开始</button>
        </div>
      )}

      {state === 'running' && currentStep && (
        <div className="text-center py-8">
          <p className="text-calm-400 text-sm mb-4">{currentStepIndex + 1} / {steps.length}</p>
          <motion.div
            className={`w-40 h-40 mx-auto rounded-full flex items-center justify-center shadow-lg mb-6 ${
              phase === 'tense' ? 'bg-gradient-to-br from-orange-300 to-orange-500' : 'bg-gradient-to-br from-calm-300 to-calm-500'
            }`}
            animate={{ scale: phase === 'tense' ? 1 + progress * 0.3 : 1.3 - progress * 0.3 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="text-center text-white">
              <p className="text-4xl mb-1">{bodyPartEmoji[currentStep.body_part] || '✨'}</p>
              <p className="text-lg font-semibold">{phase === 'tense' ? '收紧' : phase === 'relax' ? '放松' : '准备'}</p>
            </div>
          </motion.div>
          <h2 className="text-2xl font-bold text-calm-800 mb-2">{currentStep.body_part}</h2>
          <p className="text-calm-600 text-lg mb-4">{phase === 'tense' ? currentStep.tense_prompt : currentStep.relax_prompt}</p>
          {(phase === 'tense' || phase === 'relax') && (
            <p className="text-4xl font-light text-calm-700">{timeRemaining}</p>
          )}
          <div className="flex justify-center gap-4 mt-4 mb-6">
            <span className={`px-3 py-1 rounded-full text-sm ${phase === 'tense' ? 'bg-orange-100 text-orange-600' : 'bg-calm-50 text-calm-400'}`}>收紧</span>
            <span className={`px-3 py-1 rounded-full text-sm ${phase === 'relax' ? 'bg-calm-100 text-calm-600' : 'bg-calm-50 text-calm-400'}`}>放松</span>
          </div>
          <button onClick={stop} className="text-calm-400 text-sm hover:text-calm-600 transition-colors">结束</button>
        </div>
      )}

      {state === 'completed' && (
        <div className="text-center py-12">
          <p className="text-calm-600 text-xl mb-2">做得很好 ✨</p>
          <p className="text-calm-400 text-sm mb-6">你的身体现在应该感觉轻松了很多。</p>
          <button onClick={() => navigate('/')} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">返回首页</button>
        </div>
      )}
    </Layout>
  );
}
