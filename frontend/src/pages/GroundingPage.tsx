import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import AICoach from '../components/AICoach';
import StepTimer from '../components/StepTimer';
import GroundingStepCard from '../components/GroundingStep';
import { useGrounding } from '../hooks/useGrounding';
import { useAudio } from '../hooks/useAudio';
import type { Guide, GroundingConfig } from '../types';

const senseIcons: Record<string, string> = { '看': '👁️', '触摸': '✋', '听': '👂', '闻': '👃', '尝': '👅' };
const senseColors: Record<string, string> = { '看': 'from-blue-300 to-blue-500', '触摸': 'from-amber-300 to-amber-500', '听': 'from-violet-300 to-violet-500', '闻': 'from-pink-300 to-pink-500', '尝': 'from-green-300 to-green-500' };

export default function GroundingPage() {
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const steps = (guide?.config as GroundingConfig)?.steps || [];
  const { state, currentStepIndex, entryCount, notes, currentInput, start, setInput, addEntry, skipStep, stop } = useGrounding(steps);
  const { playBell } = useAudio();

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/guides?slug=${slug}`).then((r) => r.json()).then((data) => {
      const g = Array.isArray(data) ? data[0] : data;
      if (g) setGuide(g);
    }).catch(() => {
      setGuide({ id: 'fallback', slug, title: '5-4-3-2-1 感官着陆', description: '', category: 'grounding',
        config: { steps: [
          { sense: '看', count: 5, prompt: '说出你能看到的5样东西' },
          { sense: '触摸', count: 4, prompt: '说出你能触摸到的4样东西' },
          { sense: '听', count: 3, prompt: '说出你能听到的3种声音' },
          { sense: '闻', count: 2, prompt: '说出你能闻到的2种气味' },
          { sense: '尝', count: 1, prompt: '说出你能尝到的1种味道' },
        ] }, sort_order: 0 });
    });
  }, [slug]);

  const handleStart = async () => {
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
        body: JSON.stringify({ completed_at: new Date().toISOString(), notes }) }).catch(() => {});
    }
  }, [state, sessionId, notes]);

  if (!guide) return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex];

  if (state === 'idle') {
    return (
      <Layout title={guide.title}>
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
          <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-calm-100 mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🌿</span>
            <div>
              <h2 className="font-semibold text-calm-800">5-4-3-2-1 感官着陆</h2>
              <p className="text-calm-400 text-xs">5 种感官 · 约 5 分钟</p>
            </div>
          </div>
          <p className="text-calm-600 text-sm leading-relaxed mb-4">
            当你感到焦虑或恐慌时，这个技巧可以帮你迅速回到当下。通过依次调动五种感官，把注意力从焦虑思绪拉回到真实世界。
          </p>
          <div className="space-y-3 mb-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${senseColors[s.sense] || 'from-calm-300 to-calm-500'} flex items-center justify-center text-white text-lg shadow-sm`}>
                  {senseIcons[s.sense] || '✨'}
                </div>
                <div>
                  <p className="text-calm-700 text-sm font-medium">{s.sense} — {s.count} 样</p>
                  <p className="text-calm-400 text-xs">{s.prompt}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-calm-50 rounded-xl p-3">
            <p className="text-calm-500 text-xs">💡 不需要说出声，在心里默默留意就好。找不到某个感官可以跳过。</p>
          </div>
        </div>
        <div className="text-center">
          <button onClick={handleStart} className="rounded-full bg-calm-500 text-white px-10 py-4 font-semibold shadow-md text-lg">开始着陆</button>
        </div>
      </Layout>
    );
  }

  if (state === 'running' && currentStep) {
    return (
      <Layout title={guide.title}>
        <div className="text-center mb-4 animate-fade-in">
          <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${senseColors[currentStep.sense] || 'from-calm-300 to-calm-500'} flex items-center justify-center text-2xl text-white shadow-lg mb-2`}>
            {senseIcons[currentStep.sense] || '✨'}
          </div>
          <p className="text-calm-400 text-sm">第 {currentStepIndex + 1} / {totalSteps} 步</p>
        </div>
        <div className="w-full bg-calm-100 rounded-full h-2 mb-4">
          <div className="bg-calm-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentStepIndex + entryCount / currentStep.count) / totalSteps) * 100}%` }} />
        </div>

        {/* Step timer */}
        <div className="mb-4">
          <StepTimer label={`${currentStep.sense} · ${entryCount}/${currentStep.count}`} running={true} />
        </div>

        <GroundingStepCard sense={currentStep.sense} count={currentStep.count} prompt={currentStep.prompt}
          entryCount={entryCount} currentInput={currentInput} onInputChange={setInput} onAdd={addEntry} onSkip={skipStep} />
        {notes.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-calm-400 text-xs">已记录：</p>
            {notes.map((note, i) => (
              <div key={i} className="text-sm text-calm-600 bg-calm-50 rounded-lg px-3 py-2">
                {senseIcons[steps[note.step]?.sense]} {note.text}
              </div>
            ))}
          </div>
        )}
        <button onClick={stop} className="mt-6 w-full text-center text-calm-400 text-sm">结束引导</button>
        <AICoach guideType="grounding" currentPhase={currentStep?.sense || ''} triggerKey={currentStepIndex} enabled={true} />
      </Layout>
    );
  }

  // completed
  return (
    <Layout title={guide.title}>
      <div className="text-center py-12 animate-spring-in">
        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center shadow-lg mb-6">
          <span className="text-4xl">✨</span>
        </div>
        <p className="text-calm-700 text-xl font-semibold mb-2">你回来了</p>
        <p className="text-calm-400 text-sm mb-6">感受脚下的大地，你一直都在这里。</p>
        <button onClick={() => navigate('/')} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold">返回首页</button>
      </div>
    </Layout>
  );
}
