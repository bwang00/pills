import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import GroundingStepCard from '../components/GroundingStep';
import { useGrounding } from '../hooks/useGrounding';
import type { Guide, GroundingConfig } from '../types';

export default function GroundingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const steps = (guide?.config as GroundingConfig)?.steps || [];
  const { state, currentStepIndex, entryCount, notes, currentInput, start, setInput, addEntry, skipStep, stop } = useGrounding(steps);

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
    } catch { /* non-critical */ }
    start();
  };

  useEffect(() => {
    if (state === 'completed' && sessionId) {
      fetch(`/api/sessions?id=${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: new Date().toISOString(), notes })
      }).catch(() => {});
    }
  }, [state, sessionId, notes]);

  if (!guide) return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex];

  return (
    <Layout title={guide.title}>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>

      {state === 'idle' && (
        <div className="text-center py-12">
          <p className="text-calm-600 mb-6">通过五感逐步将注意力拉回当下。<br />整个过程大约需要 5 分钟。</p>
          <button onClick={handleStart} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">开始</button>
        </div>
      )}

      {state === 'running' && currentStep && (
        <>
          <div className="w-full bg-calm-100 rounded-full h-2 mb-6">
            <div className="bg-calm-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIndex + entryCount / currentStep.count) / totalSteps) * 100}%` }} />
          </div>
          <GroundingStepCard sense={currentStep.sense} count={currentStep.count} prompt={currentStep.prompt}
            entryCount={entryCount} currentInput={currentInput} onInputChange={setInput} onAdd={addEntry} onSkip={skipStep} />
          {notes.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-calm-400 text-xs">已记录：</p>
              {notes.map((note, i) => (
                <div key={i} className="text-sm text-calm-600 bg-calm-50 rounded-lg px-3 py-2">{steps[note.step]?.sense}: {note.text}</div>
              ))}
            </div>
          )}
          <button onClick={stop} className="mt-6 w-full text-center text-calm-400 text-sm hover:text-calm-600 transition-colors">结束引导</button>
        </>
      )}

      {state === 'completed' && (
        <div className="text-center py-12">
          <p className="text-calm-600 text-xl mb-2">做得很好 ✨</p>
          <p className="text-calm-400 text-sm mb-6">你已经完成了感官着陆练习。希望你现在感觉好一些了。</p>
          <button onClick={() => navigate('/')} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">返回首页</button>
        </div>
      )}
    </Layout>
  );
}
