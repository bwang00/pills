import { useState, useEffect, useRef, useCallback } from 'react';

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

export default function AICoach({ guideType, currentPhase = '', triggerKey, enabled = true }: AICoachProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const msgIdRef = useRef(0);
  const lastTriggerRef = useRef<string>('');

  const fetchTip = useCallback(async () => {
    if (!enabled) return;
    setIsThinking(true);
    setIsSpeaking(false);
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
        setMessages((prev) => [...prev.slice(-1), { text: data.suggestion, id }]);
        setIsThinking(false);
        setIsSpeaking(true);
        // Simulate speaking duration based on text length
        const speakDuration = Math.min(data.suggestion.length * 80, 6000);
        setTimeout(() => {
          setIsSpeaking(false);
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }, speakDuration);
      }
    } catch {
      setIsThinking(false);
    } finally {
      // keep isThinking false after fetch
    }
  }, [guideType, currentPhase, enabled]);

  useEffect(() => {
    const key = `${triggerKey ?? ''}-${currentPhase}`;
    if (key === lastTriggerRef.current || !enabled) return;
    lastTriggerRef.current = key;
    fetchTip();
  }, [triggerKey, currentPhase, fetchTip, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(fetchTip, 25000);
    return () => clearInterval(timer);
  }, [fetchTip, enabled]);

  if (!enabled) return null;
  const currentMsg = messages[messages.length - 1];

  return (
    <div className="fixed bottom-20 left-0 right-0 flex flex-col items-center z-50 pointer-events-none px-4">
      {/* Avatar */}
      <div className="relative coach-float mb-3">
        {/* Pulse rings */}
        {(isThinking || isSpeaking) && (
          <>
            <div className="coach-pulse-ring" />
            <div className="coach-pulse-ring coach-pulse-ring-delayed" />
          </>
        )}
        <img src="/images/coach-avatar.png" alt="AI Coach" className="coach-avatar" />
        {/* Status indicator */}
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-medium ${
          isThinking ? 'bg-amber-100 text-amber-600' : isSpeaking ? 'bg-calm-100 text-calm-600' : 'bg-gray-100 text-gray-400'
        }`}>
          {isThinking ? '思考中' : isSpeaking ? '说话中' : '陪伴中'}
        </div>
      </div>

      {/* Thinking dots */}
      {isThinking && (
        <div className="bg-white rounded-2xl px-5 py-3 shadow-lg border border-calm-100 coach-message pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="coach-thinking">
              <span className="thinking-dot" style={{ animationDelay: '0s' }}></span>
              <span className="thinking-dot" style={{ animationDelay: '0.15s' }}></span>
              <span className="thinking-dot" style={{ animationDelay: '0.3s' }}></span>
            </span>
            <span className="text-calm-400 text-sm">正在想怎么鼓励你…</span>
          </div>
        </div>
      )}

      {/* Message bubble */}
      {currentMsg && !isThinking && (
        <div className="bg-white rounded-2xl px-5 py-3 shadow-lg border border-calm-100 max-w-sm coach-message pointer-events-auto">
          <p className="text-calm-700 text-sm leading-relaxed text-center">{currentMsg.text}</p>
        </div>
      )}
    </div>
  );
}
