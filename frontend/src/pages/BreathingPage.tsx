import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import AICoach from '../components/AICoach';
import { useBreathing } from '../hooks/useBreathing';
import { useAudio } from '../hooks/useAudio';
import type { Guide, BreathingConfig } from '../types';

export default function BreathingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace('/guide/', '');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  const phases = (guide?.config as BreathingConfig)?.phases || [];
  const totalRounds = 4;
  const { state, currentPhaseIndex, timeRemaining, progress, currentRound, start, pause, resume, stop } = useBreathing(phases, totalRounds);
  const { playTone, playBell } = useAudio();

  const prevPhaseRef = useRef(-1);

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

  // Sound on phase change
  useEffect(() => {
    if (state !== 'running' || !soundOn) return;
    if (currentPhaseIndex !== prevPhaseRef.current) {
      prevPhaseRef.current = currentPhaseIndex;
      const name = phases[currentPhaseIndex]?.name || '';
      if (name === '吸气') playTone('inhale');
      else if (name === '屏息') playTone('hold');
      else if (name === '呼气') playTone('exhale');
      else playTone('transition');
    }
  }, [currentPhaseIndex, state, soundOn, phases, playTone]);

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
        body: JSON.stringify({ completed_at: new Date().toISOString(), duration_seconds: totalRounds * phases.reduce((s, p) => s + p.duration, 0) }) }).catch(() => {});
      if (soundOn) playBell();
    }
  }, [state, sessionId, totalRounds, phases, soundOn, playBell]);

  if (!guide) return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;
  const phaseName = phases[currentPhaseIndex]?.name || '';
  const totalCycleDuration = phases.reduce((s, p) => s + p.duration, 0);

  // SVG circle params
  const circleR = 80;
  const circumference = 2 * Math.PI * circleR;
  const strokeOffset = circumference * (1 - progress);

  return (
    <Layout title={guide.title}>
      {/* Sound toggle */}
      <div className="flex justify-end mb-2">
        <button onClick={() => setSoundOn(!soundOn)} className="text-calm-400 hover:text-calm-600 text-sm transition-colors">
          {soundOn ? '🔊 声音开' : '🔇 声音关'}
        </button>
      </div>

      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
        <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
      </div>

      {/* Intro screen */}
      {showIntro && state === 'idle' && (
        <div className="py-4">
          <div className="bg-white/60 backdrop-blur rounded-2xl p-6 shadow-sm border border-calm-100 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🫁</span>
              <div>
                <h2 className="font-semibold text-calm-800">什么是{guide.title}？</h2>
                <p className="text-calm-400 text-xs">呼吸调节 · 约 {Math.ceil(totalCycleDuration * totalRounds / 60)} 分钟</p>
              </div>
            </div>
            <p className="text-calm-600 text-sm leading-relaxed mb-4">
              {slug.includes('478') ? (
                <>4-7-8 呼吸法由 Andrew Weil 博士推广，被称为"神经系统的天然镇静剂"。通过特定的节奏（吸气4秒、屏息7秒、呼气8秒），激活副交感神经，帮助身体从"战斗或逃跑"模式切换到放松状态。</>
              ) : slug.includes('box') ? (
                <>方块呼吸（Box Breathing）被美国海豹突击队广泛使用。四个阶段等长时间，形成一个"方块"，帮助在高压环境下保持冷静和专注。</>
              ) : (
                <>有意识地控制呼吸节奏，是调节情绪最直接的方式之一。跟着引导，让呼吸慢下来。</>
              )}
            </p>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-calm-700">步骤</h3>
              {phases.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    p.name === '吸气' ? 'bg-calm-400' : p.name === '屏息' ? 'bg-calm-500' : 'bg-calm-300'
                  }`}>{i + 1}</div>
                  <div>
                    <p className="text-calm-700 text-sm font-medium">{p.name}</p>
                    <p className="text-calm-400 text-xs">{p.duration} 秒</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 bg-calm-50 rounded-xl p-3">
              <p className="text-calm-500 text-xs">💡 小贴士：用鼻子吸气，用嘴缓缓呼气。不需要追求完美，跟着节奏就好。</p>
            </div>
          </div>
          <div className="text-center">
            <button onClick={handleStart} className="rounded-full bg-calm-500 text-white px-10 py-4 font-semibold hover:bg-calm-600 transition-colors shadow-md hover:shadow-lg text-lg">
              开始练习
            </button>
          </div>
        </div>
      )}

      {/* Running */}
      {state === 'running' && (
        <div className="text-center py-4">
          <p className="text-calm-400 text-sm mb-6">第 {currentRound} / {totalRounds} 轮</p>

          {/* SVG breathing circle with progress ring */}
          <div className="relative w-56 h-56 mx-auto mb-6">
            <svg className="w-full h-full" viewBox="0 0 200 200">
              {/* Background circle */}
              <circle cx="100" cy="100" r={circleR} fill="none" stroke="#e0e7ef" strokeWidth="6" />
              {/* Progress ring */}
              <motion.circle
                cx="100" cy="100" r={circleR}
                fill="none"
                stroke={phaseName === '吸气' ? '#7cb8d4' : phaseName === '呼气' ? '#a3c9e0' : '#8fb8cc'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 100 100)"
                transition={{ duration: 0.3 }}
              />
            </svg>
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                scale: phaseName === '吸气' ? 1 + progress * 0.15 : phaseName === '呼气' ? 1.15 - progress * 0.15 : 1.075,
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className={`w-36 h-36 rounded-full flex items-center justify-center shadow-lg ${
                phaseName === '吸气' ? 'bg-gradient-to-br from-calm-300 to-calm-500' :
                phaseName === '屏息' ? 'bg-gradient-to-br from-calm-400 to-calm-600' :
                'bg-gradient-to-br from-calm-200 to-calm-400'
              }`}>
                <div className="text-center text-white">
                  <p className="text-xl font-semibold">{phaseName}</p>
                  <p className="text-5xl font-light mt-1">{timeRemaining}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Phase timeline */}
          <div className="flex justify-center gap-2 mb-6 max-w-xs mx-auto">
            {phases.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i < currentPhaseIndex ? 'bg-calm-400' : i === currentPhaseIndex ? 'bg-calm-500' : 'bg-calm-200'
              }`} />
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <button onClick={pause} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">暂停</button>
            <button onClick={stop} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">结束</button>
          </div>
        </div>
      )}

      {state === 'paused' && (
        <div className="text-center py-12">
          <motion.div
            className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-calm-200 to-calm-400 flex items-center justify-center shadow-lg mb-6"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <p className="text-xl text-white">已暂停</p>
          </motion.div>
          <div className="flex justify-center gap-4">
            <button onClick={resume} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">继续</button>
            <button onClick={stop} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">结束</button>
          </div>
        </div>
      )}

      {state === 'completed' && (
        <div className="text-center py-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center shadow-lg mb-6"
          >
            <span className="text-4xl">✨</span>
          </motion.div>
          <p className="text-calm-700 text-xl font-semibold mb-2">做得很好</p>
          <p className="text-calm-400 text-sm mb-2">你完成了 {totalRounds} 轮呼吸练习</p>
          <p className="text-calm-400 text-sm mb-6">花一点时间感受身体的变化。</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => { setShowIntro(true); start(); stop(); }} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3 hover:bg-calm-50 transition-colors">再来一次</button>
            <button onClick={() => navigate('/')} className="rounded-full bg-calm-500 text-white px-8 py-3 font-semibold hover:bg-calm-600 transition-colors">返回首页</button>
          </div>
        </div>
      )}

      {/* AI Coach */}
      <AICoach
        guideType="breathing"
        currentPhase={phaseName}
        triggerKey={currentRound}
        enabled={state === 'running'}
      />
    </Layout>
  );
}
