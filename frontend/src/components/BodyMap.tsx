

interface BodyMapProps {
  currentBodyPart: string;
  phase: 'tense' | 'relax' | 'transition' | 'idle' | 'completed';
}

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

export default function BodyMap({ currentBodyPart, phase }: BodyMapProps) {
  const glowColor = phase === 'tense' ? '#f97316' : '#7cb8d4';
  const isActive = phase === 'tense' || phase === 'relax';

  return (
    <div className="relative w-48 h-64 mx-auto mb-4">
      <svg viewBox="0 0 200 250" className="w-full h-full">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Body outline */}
        <ellipse cx="100" cy="35" rx="28" ry="32" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="65" y="68" width="70" height="95" rx="12" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="30" y="75" width="22" height="80" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="148" y="75" width="22" height="80" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="72" y="165" width="22" height="60" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="106" y="165" width="22" height="60" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        
        {/* Body parts with animation */}
        {Object.entries(bodyPartPaths).map(([part, d]) => {
          const isCurrent = part === currentBodyPart;
          return (
            <path
              key={part}
              d={d}
              fill={isCurrent && isActive ? glowColor : 'transparent'}
              stroke={isCurrent && isActive ? glowColor : 'transparent'}
              strokeWidth={isCurrent ? 3 : 2}
              opacity={isCurrent ? 1 : 0.3}
              filter={isCurrent && isActive ? 'url(#glow)' : undefined}
              className={isCurrent && isActive ? 'animate-pulse-glow' : ''}
              style={{ transition: 'opacity 0.5s ease, fill 0.3s ease' }}
            />
          );
        })}
      </svg>
    </div>
  );
}
