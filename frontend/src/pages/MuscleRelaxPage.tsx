import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import AICoach from '../components/AICoach';
import StepTimer from '../components/StepTimer';
import { useMuscleRelax } from '../hooks/useMuscleRelax';
import { useAudio } from '../hooks/useAudio';
import { useSession } from '../hooks/useSession';
import type { Guide, MuscleRelaxConfig } from '../types';

const bodyPartEmoji: Record<string, string> = {
  '额头': '🧠', '下巴': '😮', '肩膀': '💪', '手臂': '🤜',
  '腹部': '🫁', '背部': '🔙', '大腿': '🦵', '双脚': '🦶',
};

const bodyPartPaths: Record<string, string> = {
  '额头': 'M70 25 Q100 10 130 25 Q130 40 100 42 Q70 40 70 25Z',
  '下巴': 'M80 55 Q100 70 120 55 Q120 68 100 72 Q80 68 80 55Z',
  '肩膀': 'M45 90 Q60 82 80 88 M120 88 Q140 82 155 90 L155 100 Q140 95 120 98 M80 98 Q60 95 45 100Z',
  '手臂': 'M30 105 Q35 100 45 100 L45 155 Q35 160 30 155Z M155 100 Q165 100 170 105 L170 155 Q165 160 155 155Z',
  '腹部': 'M75 120 Q100 115 125 120 L125 155 Q100 160 75 155Z',
  '背部': 'M70 95 Q100 90 130 95 L130 130 Q100 135 70 130Z',
  '大腿': 'M70 165 L85 165 L82 215 L68 215Z M115 165 L130 165 L132 215 L118 215Z',
  '双脚': 'M65 220 L85 220 L85 235 Q75 240 65 235Z M115 220 L135 220 L135 235 Q125 240 115 235Z',
};

export default function MuscleRelaxPage() {
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const { startSession, completeSession } = useSession(slug);

  const steps = (guide?.config as MuscleRelaxConfig)?.steps || [];
  const { state, currentStepIndex, phase, timeRemaining, progress, start, stop } = useMuscleRelax(steps);
  const { playBell, unlockAudio } = useAudio();
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
    await unlockAudio();
    setShowIntro(false);
    await startSession();
    playBell();
    start();
  };

  useEffect(() => {
    if (state === 'completed') {
      completeSession();
    }
  }, [state, completeSession]);

  if (!guide) return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;
  const estimatedMins = Math.ceil(steps.reduce((s, st) => s + st.tense_duration + st.relax_duration + 3, 0) / 60);

  return (
    <Layout title={guide.title}>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>

      {showIntro && state === 'idle' && (
        <div className="py-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-calm-100 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💆</span>
              <div>
                <h2 className="font-semibold text-calm-800">渐进式肌肉放松</h2>
                <p className="text-calm-400 text-xs">{steps.length} 个部位 · 约 {estimatedMins} 分钟</p>
              </div>
            </div>
            <p className="text-calm-600 text-sm leading-relaxed mb-4">
              通过交替收紧和放松身体各部位的肌肉，帮助你感受紧张与放松的区别，逐步释放身体积累的紧张感。
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-calm-50 rounded-lg px-3 py-2">
                  <span className="text-lg">{bodyPartEmoji[s.body_part] || '✨'}</span>
                  <span className="text-calm-700 text-sm">{s.body_part}</span>
                </div>
              ))}
            </div>
            <div className="bg-calm-50 rounded-xl p-3">
              <p className="text-calm-500 text-xs">💡 收紧时不需要太用力，感觉到肌肉绷紧就好。</p>
            </div>
          </div>
          <div className="text-center">
            <button onClick={handleStart} className="rounded-full bg-calm-500 text-white px-10 py-4 font-semibold shadow-md text-lg">开始放松</button>
          </div>
        </div>
      )}

      {state === 'running' && currentStep && (
        <div className="text-center py-4 animate-fade-in">
          <p className="text-calm-400 text-sm mb-4">{currentStepIndex + 1} / {steps.length}</p>
          <div className="relative w-48 h-64 mx-auto mb-4">
            <svg viewBox="0 0 200 250" className="w-full h-full">
              <ellipse cx="100" cy="35" rx="28" ry="32" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
              <rect x="65" y="68" width="70" height="95" rx="12" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
              <rect x="30" y="75" width="22" height="80" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
              <rect x="148" y="75" width="22" height="80" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
              <rect x="72" y="165" width="22" height="60" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
              <rect x="106" y="165" width="22" height="60" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
              {Object.entries(bodyPartPaths).map(([part, d]) => (
                <path key={part} d={d} className={part === currentStep.body_part ? (phase === 'tense' ? 'body-highlight-tense' : 'body-highlight-relax') : ''}
                  fill={part === currentStep.body_part ? undefined : 'transparent'}
                  stroke={part === currentStep.body_part ? undefined : 'transparent'} strokeWidth="2" />
              ))}
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-calm-800 mb-1">{bodyPartEmoji[currentStep.body_part] || '✨'} {currentStep.body_part}</h2>
          <p className="text-calm-600 text-lg mb-3">{phase === 'tense' ? currentStep.tense_prompt : currentStep.relax_prompt}</p>
          {(phase === 'tense' || phase === 'relax') && (
            <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center shadow-lg mb-4 ${
              phase === 'tense' ? 'bg-gradient-to-br from-orange-300 to-orange-500' : 'bg-gradient-to-br from-calm-300 to-calm-500'
            }`} style={{ transform: `scale(${phase === 'tense' ? 1 + progress * 0.15 : 1.15 - progress * 0.15})`, transition: 'transform 0.3s' }}>
              <p className="text-4xl font-light text-white">{timeRemaining}</p>
            </div>
          )}
          {phase === 'transition' && <p className="text-calm-500 text-lg mb-4 animate-pulse-slow">准备下一个部位…</p>}
          <div className="max-w-xs mx-auto mb-4">
            <StepTimer label={`${currentStep.body_part} · ${phase === 'tense' ? '收紧' : '放松'}`} running={phase === 'tense' || phase === 'relax'} targetSeconds={phase === 'tense' ? currentStep.tense_duration : currentStep.relax_duration} />
          </div>
          <div className="flex justify-center gap-3 mb-6">
            <span className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${phase === 'tense' ? 'bg-orange-100 text-orange-600' : 'bg-calm-50 text-calm-400'}`}>收紧</span>
            <span className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${phase === 'relax' ? 'bg-calm-100 text-calm-600' : 'bg-calm-50 text-calm-400'}`}>放松</span>
          </div>
          <div className="flex justify-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
                i < currentStepIndex ? 'bg-calm-400' : i === currentStepIndex ? 'bg-calm-600 scale-125' : 'bg-calm-200'
              }`} />
            ))}
          </div>
          <div className="flex justify-center">
            <button onClick={stop} className="rounded-full border border-calm-300 text-calm-600 px-8 py-3">结束练习</button>
          </div>
        </div>
      )}

      {state === 'completed' && (
        <div className="text-center py-12 animate-spring-in">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center shadow-lg mb-6">
            <span className="text-4xl">✨</span>
          </div>
          <p className="text-calm-700 text-xl font-semibold mb-2">身体放松了</p>
          <p className="text-calm-400 text-sm mb-6">感受一下，身体是不是比刚才轻松了许多？</p>
          <button onClick={() => navigate('/')} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold">返回首页</button>
        </div>
      )}

      <AICoach guideType="muscle_relax" currentPhase={currentStep?.body_part || ''} triggerKey={currentStepIndex} enabled={state === 'running'} voiceOn={false} />
    </Layout>
  );
}
