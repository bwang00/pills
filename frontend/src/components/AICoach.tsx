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

  useEffect(() => {
    const key = `${triggerKey ?? ''}-${currentPhase}`;
    if (key === lastTriggerRef.current || !enabled) return;
    lastTriggerRef.current = key;
    fetchTip();
  }, [triggerKey, currentPhase, fetchTip, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(fetchTip, 30000);
    return () => clearInterval(timer);
  }, [fetchTip, enabled]);

  if (!enabled) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, left: 16, right: 16, maxWidth: 480, margin: '0 auto', zIndex: 50, pointerEvents: 'none' }}>
      {messages.map((msg) => (
        <div key={msg.id} style={{ pointerEvents: 'auto', marginBottom: 8 }}>
          <div className="ai-coach-bubble">
            <span className="ai-coach-face">{COACH_FACES[faceIndex]}</span>
            <p style={{ fontSize: 14, color: '#0f7665', lineHeight: 1.6, margin: 0 }}>{msg.text}</p>
          </div>
        </div>
      ))}
      {isThinking && messages.length === 0 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: '10px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', pointerEvents: 'auto' }}>
          <span style={{ fontSize: 20 }}>🧘</span>
          <span className="thinking-dots">
            <span className="thinking-dot" style={{ animationDelay: '0s' }}></span>
            <span className="thinking-dot" style={{ animationDelay: '0.15s' }}></span>
            <span className="thinking-dot" style={{ animationDelay: '0.3s' }}></span>
          </span>
        </div>
      )}
    </div>
  );
}
