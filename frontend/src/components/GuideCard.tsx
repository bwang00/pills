import { Link } from 'react-router-dom';
import type { Guide } from '../types';

interface GuideCardProps {
  guide: Guide;
}

const categoryIcons: Record<string, string> = {
  breathing: '🫁',
  grounding: '🌿',
  muscle_relax: '💆',
  mindfulness: '🧘',
};

export default function GuideCard({ guide }: GuideCardProps) {
  return (
    <Link
      to={`/guide/${guide.slug}`}
      className="block bg-white rounded-2xl p-6 shadow-sm border border-calm-100 hover:shadow-md hover:border-calm-200 transition-all duration-300"
    >
      <div className="text-3xl mb-3">{categoryIcons[guide.category] || '✨'}</div>
      <h2 className="text-xl font-semibold text-calm-900 mb-2">{guide.title}</h2>
      <p className="text-calm-600 text-sm leading-relaxed">{guide.description}</p>
    </Link>
  );
}
