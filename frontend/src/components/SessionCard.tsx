import type { Guide } from '../types';

interface SessionData {
  id: string;
  guide_slug: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

interface SessionCardProps {
  session: SessionData;
  guides: Guide[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '进行中';
  if (seconds < 60) return `${seconds}秒`;
  return `${Math.round(seconds / 60)}分钟`;
}

const categoryIcons: Record<string, string> = {
  breathing: '🫁',
  grounding: '🌿',
  muscle_relax: '💆',
  mindfulness: '🧘',
};

export default function SessionCard({ session, guides }: SessionCardProps) {
  const guide = guides.find((g) => g.slug === session.guide_slug);
  const category = guide?.category || '';
  const title = guide?.title || session.guide_slug;
  const icon = categoryIcons[category] || '✨';
  const isComplete = session.completed_at !== null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-calm-100">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-calm-800 text-sm truncate">{title}</h3>
          <p className="text-calm-400 text-xs">{formatDate(session.started_at)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-medium ${isComplete ? 'text-calm-600' : 'text-calm-400'}`}>
            {formatDuration(session.duration_seconds)}
          </p>
          {!isComplete && <p className="text-calm-300 text-xs">进行中</p>}
        </div>
      </div>
    </div>
  );
}
