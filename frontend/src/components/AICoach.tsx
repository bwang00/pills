import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeech } from '../hooks/useSpeech';

interface AICoachProps {
  guideType: string;
  currentPhase?: string;
  triggerKey?: string | number;
  enabled?: boolean;
  voiceOn?: boolean;
}

interface CoachMessage {
  text: string;
  id: number;
}

export default function AICoach({ guideType, currentPhase = '', triggerKey, enabled = true, voiceOn = true }: AICoachProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const msgIdRef = useRef(0);
  const lastTriggerRef = useRef<string>('');
  const { speak, stop: stopSpeech } = useSpeech();

  const fetchTip = useCallback(async () => {
    if (!enabled) return;
    setIsThinking(true);
    setIsSpeaking(false);
    stopSpeech();
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

        // Speak the text if voice is on
        if (voiceOn) {
          speak(data.suggestion);
        }

        // Auto-dismiss after a while
        const dismissTime = Math.max(data.suggestion.length * 100, 5000);
        setTimeout(() => {
          setIsSpeaking(false);
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }, dismissTime);
      }
    } catch {
      setIsThinking(false);
    }
  }, [guideType, currentPhase, enabled, voiceOn, speak, stopSpeech]);

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

  // Stop speech when disabled
  useEffect(() => {
    if (!enabled) {
      stopSpeech();
      setIsSpeaking(false);
      setMessages([]);
    }
  }, [enabled, stopSpeech]);

  if (!enabled) return null;
  const currentMsg = messages[messages.length - 1];

  return (
    <div className="fixed bottom-4 left-4 flex flex-col items-center z-50 pointer-events-none px-4">
      {/* Avatar */}
      <div className="relative coach-float mb-3">
        {(isThinking || isSpeaking) && (
          <>
            <div className="coach-pulse-ring" />
            <div className="coach-pulse-ring coach-pulse-ring-delayed" />
          </>
        )}
        <img src="/images/coach-avatar.png" alt="AI Coach" className={`coach-avatar ${isSpeaking ? 'coach-speaking-avatar' : ''}`} />
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
          isThinking ? 'bg-amber-100 text-amber-600' : isSpeaking ? 'bg-calm-100 text-calm-600' : 'bg-gray-100 text-gray-400'
        }`}>
          {isThinking ? '思考中…' : isSpeaking ? '🔊 说话中' : '陪伴中'}
        </div>
      </div>

      {/* Thinking */}
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

      {/* Message */}
      {currentMsg && !isThinking && (
        <div className="bg-white rounded-2xl px-5 py-3 shadow-lg border border-calm-100 max-w-sm coach-message pointer-events-auto">
          <p className="text-calm-700 text-sm leading-relaxed text-center">{currentMsg.text}</p>
        </div>
      )}
    </div>
  );
}
