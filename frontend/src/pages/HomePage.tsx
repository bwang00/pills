import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import GuideCard from '../components/GuideCard';
import type { Guide } from '../types';

export default function HomePage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/guides')
      .then((res) => res.json())
      .then((data) => { setGuides(data); setLoading(false); })
      .catch(() => { setGuides([]); setLoading(false); });
  }, []);

  return (
    <Layout>
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-calm-800 mb-2">此刻，深呼吸</h1>
        <p className="text-calm-500 text-lg">选择一个引导，让自己慢下来</p>
      </div>
      {loading ? (
        <div className="text-center text-calm-400 py-12">加载中…</div>
      ) : guides.length === 0 ? (
        <div className="text-center text-calm-400 py-12">暂无引导内容</div>
      ) : (
        <div className="space-y-4">
          {guides.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      )}
    </Layout>
  );
}
