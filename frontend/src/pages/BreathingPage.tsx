import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import type { Guide, BreathingConfig } from '../types';

export default function BreathingPage() {

  const navigate = useNavigate();

  const { slug = '' } = useParams<{ slug: string }>();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/guides?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        const g = Array.isArray(data) ? data[0] : data;
        if (g) setGuide(g);
      })
      .catch(() => {
        setGuide({ id: 'fallback', slug, title: '呼吸引导', description: '', category: 'breathing',
          config: { phases: [{ name: '吸气', duration: 4 }, { name: '屏息', duration: 7 }, { name: '呼气', duration: 8 }] }, sort_order: 0 });
      });
  }, [slug]);

  if (!guide) {
    return <Layout title="加载中…"><div className="text-center text-calm-400 py-16">加载中…</div></Layout>;
  }

  const phases = (guide.config as BreathingConfig)?.phases || [];

  if (!started) {
    return (
      <Layout title={guide.title}>
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-calm-800">{guide.title}</h1>
          <p className="text-calm-500 text-sm mt-1">{guide.description}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-calm-100 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🫁</span>
            <h2 className="font-semibold text-calm-800">什么是{guide.title}？</h2>
          </div>
          <p className="text-calm-600 text-sm leading-relaxed mb-4">
            {slug.includes('478')
              ? '4-7-8 呼吸法被称为"神经系统的天然镇静剂"。通过吸气4秒、屏息7秒、呼气8秒的节奏，激活副交感神经，帮助身体放松。'
              : slug.includes('box')
              ? '方块呼吸被广泛使用于高压环境。四个阶段等长时间，帮助保持冷静和专注。'
              : '有意识地控制呼吸节奏，是调节情绪最直接的方式之一。'}
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
          <div className="mt-4 bg-calm-50 rounded-xl p-3">
            <p className="text-calm-500 text-xs">💡 用鼻子吸气，用嘴缓缓呼气。不需要追求完美，跟着节奏就好。</p>
          </div>
        </div>
        <div className="text-center">
          <button onClick={() => setStarted(true)} className="rounded-full bg-calm-500 text-white px-10 py-4 font-semibold shadow-md text-lg">
            开始练习
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={guide.title}>
      <div className="text-center py-8">
        <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-calm-300 to-calm-500 flex items-center justify-center shadow-lg mb-6 animate-pulse-gentle">
          <div className="text-center text-white">
            <p className="text-xl font-semibold">准备好了吗？</p>
          </div>
        </div>
        <p className="text-calm-500 text-sm mb-6">练习即将开始…</p>
        <button onClick={() => navigate('/')} className="rounded-full border border-calm-300 text-calm-600 px-6 py-3">返回首页</button>
      </div>
    </Layout>
  );
}
