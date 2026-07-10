import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AICoachProps {
  guideType: string;
  currentPhase?: string;
  triggerKey?: string | number;
  enabled?: boolean;
}

interface CoachMessage {
  text: string;
  id: number;
}

const COACH_FACES = ['🧘', '💚', '🌊', '🌿', '✨'];

export default function AICoach({ guideType, currentPhase = '', triggerKey, enabled = true }: AICoachProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [faceIndex, setFaceIndex] = useState(0);
  const msgIdRef = useRef(0);
  const lastTriggerRef = useRef<string>('');

  const fetchTip = useCallback(async () => {
    if (!enabled) return;
    setIsThinking(true);
    try {
      const res = await fetch('/api/ai-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guide_type: guideType,
          current_phase: currentPhase,
          user_input: '',
        }),
      });
      const data = await res.json();
      if (data.suggestion) {
        const id = ++msgIdRef.current;
        setMessages((prev) => [...prev.slice(-2), { text: data.suggestion, id }]);
        setFaceIndex((i) => (i + 1) % COACH_FACES.length);
        // Auto dismiss after 6s
        setTimeout(() => {
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }, 6000);
      }
    } catch {
      // silently ignore
    } finally {
      setIsThinking(false);
    }
  }, [guideType, currentPhase, enabled]);

  // Trigger on key change or periodically
  useEffect(() => {
    const key = `${triggerKey ?? ''}-${currentPhase}`;
    if (key === lastTriggerRef.current || !enabled) return;
    lastTriggerRef.current = key;
    fetchTip();
  }, [triggerKey, currentPhase, fetchTip, enabled]);

  // Periodic tips every 30s
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(fetchTip, 30000);
    return () => clearInterval(timer);
  }, [fetchTip, enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-50 pointer-events-none">
      <AnimatePresence>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mb-2 pointer-events-auto"
          >
            <div className="flex items-start gap-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 border border-calm-100">
              <motion.span
                className="text-2xl flex-shrink-0 mt-0.5"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {COACH_FACES[faceIndex]}
              </motion.span>
              <p className="text-sm text-calm-700 leading-relaxed">{msg.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {isThinking && messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-md px-4 py-3 border border-calm-100 w-fit"
        >
          <span className="text-xl">🧘</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-calm-400"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
