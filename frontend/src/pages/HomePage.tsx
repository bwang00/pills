import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
      ) : (
        <div className="space-y-4">
          {/* AI Chat Card */}
          <Link
            to="/ai-chat"
            className="block bg-gradient-to-r from-calm-400 to-calm-600 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="text-3xl mb-3">💬</div>
            <h2 className="text-xl font-semibold text-white mb-2">AI 对话</h2>
            <p className="text-calm-100 text-sm leading-relaxed">告诉我你的感受，我来为你推荐合适的放松方式</p>
          </Link>

          {guides.length > 0 ? guides.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          )) : (
            <div className="text-center text-calm-400 py-12">暂无引导内容</div>
          )}
        </div>
      )}
    </Layout>
  );
}
