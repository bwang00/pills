import { motion } from 'framer-motion';
import type { BreathingState } from '../hooks/useBreathing';

interface BreathingCircleProps {
  state: BreathingState;
  phaseName: string;
  progress: number;
  timeRemaining: number;
}

export default function BreathingCircle({ state, phaseName, progress, timeRemaining }: BreathingCircleProps) {
  const isInhale = phaseName === '吸气';
  const scale = state === 'running'
    ? isInhale ? 1 + progress * 0.5 : 1.5 - progress * 0.5
    : state === 'idle' ? 1 : 1.25;

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <motion.div
        className="w-48 h-48 rounded-full bg-gradient-to-br from-calm-300 to-calm-500 flex items-center justify-center shadow-lg"
        animate={{ scale }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="text-center text-white">
          {state === 'running' ? (
            <>
              <p className="text-2xl font-semibold">{phaseName}</p>
              <p className="text-4xl font-light mt-1">{timeRemaining}</p>
            </>
          ) : (
            <p className="text-xl">准备好了吗？</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
