import { useEffect, useState } from 'react';

interface StepTimerProps {
  label?: string;
  running?: boolean;
  targetSeconds?: number;
}

export default function StepTimer({ label, running = true, targetSeconds }: StepTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
  }, [label]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const pct = targetSeconds ? Math.min((elapsed / targetSeconds) * 100, 100) : 0;

  return (
    <div className="bg-calm-50 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#e0e7ef" strokeWidth="3" />
          {targetSeconds && (
            <circle cx="20" cy="20" r="17" fill="none" stroke="#2dd4af" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 17}
              strokeDashoffset={2 * Math.PI * 17 * (1 - pct / 100)}
              transform="rotate(-90 20 20)"
              style={{ transition: 'stroke-dashoffset 1s linear' }} />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-calm-600">{secs}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {label && <p className="text-calm-400 text-xs truncate">{label}</p>}
        <p className="text-calm-700 text-lg font-semibold tabular-nums">
          {mins}:{secs.toString().padStart(2, '0')}
        </p>
      </div>
      {targetSeconds && elapsed >= targetSeconds && (
        <span className="text-calm-400 text-xs">✓</span>
      )}
    </div>
  );
}
