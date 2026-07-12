interface ProgressBarProps {
  steps: { body_part: string }[];
  currentStepIndex: number;
  phase: string;
}

export default function ProgressBar({ steps, currentStepIndex, phase }: ProgressBarProps) {
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const barColor = phase === 'tense' ? 'bg-orange-400' : 'bg-calm-400';

  return (
    <div className="mb-6">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`text-xs transition-all ${
              i === currentStepIndex
                ? 'text-calm-800 font-semibold scale-110'
                : i < currentStepIndex
                ? 'text-calm-500'
                : 'text-calm-300'
            }`}
          >
            {step.body_part}
          </div>
        ))}
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-calm-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Count */}
      <p className="text-center text-calm-400 text-xs mt-1">
        {currentStepIndex + 1} / {steps.length} 个部位
      </p>
    </div>
  );
}
