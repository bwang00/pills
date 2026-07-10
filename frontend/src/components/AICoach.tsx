import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { useVoiceInput } from '../hooks/useVoiceInput';

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
  role: 'user' | 'coach';
}

export default function AICoach({ guideType, currentPhase = '', triggerKey, enabled = true, voiceOn = false }: AICoachProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userInput, setUserInput] = useState('');
  const msgIdRef = useRef(0);
  const lastTriggerRef = useRef<string>('');
  const { speak, stop: stopSpeech } = useSpeech();

  const sendUserMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userId = ++msgIdRef.current;
    setMessages((prev) => [...prev.slice(-3), { text, id: userId, role: 'user' }]);
    setUserInput('');

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
          user_input: text,
        }),
      });
      const data = await res.json();
      if (data.suggestion) {
        const coachId = ++msgIdRef.current;
        setMessages((prev) => [...prev.slice(-3), { text: data.suggestion, id: coachId, role: 'coach' }]);
        setIsThinking(false);
        setIsSpeaking(true);

        if (voiceOn) speak(data.suggestion);

        const dismissTime = Math.max(data.suggestion.length * 150, 6000);
        setTimeout(() => {
          setIsSpeaking(false);
          setMessages((prev) => prev.filter((m) => m.id !== coachId && m.id !== userId));
        }, dismissTime);
      }
    } catch {
      setIsThinking(false);
    }
  }, [guideType, currentPhase, voiceOn, speak, stopSpeech]);

  // Voice input callback
  const handleVoiceResult = useCallback((text: string) => {
    if (text.trim()) {
      setTimeout(() => sendUserMessage(text.trim()), 200);
    }
  }, [sendUserMessage]);

  const { isListening, transcript, startListening, stopListening, supported } = useVoiceInput(handleVoiceResult);

  // Auto-fetch tip on phase change (no user input)
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
        setMessages((prev) => [...prev.slice(-3), { text: data.suggestion, id, role: 'coach' }]);
        setIsThinking(false);
        setIsSpeaking(true);

        if (voiceOn) speak(data.suggestion);

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

  useEffect(() => {
    if (!enabled) {
      stopSpeech();
      setIsSpeaking(false);
      setMessages([]);
    }
  }, [enabled, stopSpeech]);

  // Live transcript in input field
  useEffect(() => {
    if (isListening && transcript) {
      setUserInput(transcript);
    }
  }, [isListening, transcript]);

  if (!enabled) return null;
  const coachMsg = messages.filter((m) => m.role === 'coach').pop();
  const userMsg = messages.filter((m) => m.role === 'user').pop();

  const handleSubmit = () => {
    if (userInput.trim() && !isThinking) sendUserMessage(userInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const toggleMic = () => { isListening ? stopListening() : startListening(); };

  return (
    <div className="fixed bottom-4 left-0 right-0 flex flex-col items-center z-50 pointer-events-none px-4">
      {/* Messages */}
      <div className="w-full max-w-sm space-y-2 mb-3">
        {userMsg && !isThinking && (
          <div className="flex justify-end">
            <div className="bg-calm-500 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] shadow-md pointer-events-auto">
              <p className="text-sm leading-relaxed">{userMsg.text}</p>
            </div>
          </div>
        )}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2 shadow-md border border-calm-100 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="coach-thinking">
                  <span className="thinking-dot" style={{ animationDelay: '0s' }}></span>
                  <span className="thinking-dot" style={{ animationDelay: '0.15s' }}></span>
                  <span className="thinking-dot" style={{ animationDelay: '0.3s' }}></span>
                </span>
                <span className="text-calm-400 text-sm">思考中…</span>
              </div>
            </div>
          </div>
        )}

        {coachMsg && !isThinking && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2 max-w-[80%] shadow-md border border-calm-100 pointer-events-auto">
              <p className="text-calm-700 text-sm leading-relaxed">{coachMsg.text}</p>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      <div className={`mb-2 px-3 py-1 rounded-full text-xs font-medium ${
        isListening ? 'bg-red-100 text-red-500 animate-pulse' :
        isSpeaking ? 'bg-calm-100 text-calm-600' : 'bg-gray-100 text-gray-400'
      }`}>
        {isListening ? '🎤 聆听中…' : isSpeaking ? '🔊 说话中' : '💬 有什么想说的？'}
      </div>

      {/* Input bar */}
      <div className="w-full max-w-sm pointer-events-auto">
        <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-lg border border-calm-100">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? '正在听你说…' : '说说你的感受…'}
            className="flex-1 text-sm outline-none bg-transparent text-calm-700 placeholder:text-calm-300"
            disabled={isListening}
          />
          {supported && (
            <button
              onClick={toggleMic}
              disabled={isThinking}
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isListening ? 'bg-red-500 text-white scale-110' : 'bg-calm-100 text-calm-500 hover:bg-calm-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          )}
          {userInput.trim() && !isListening && (
            <button
              onClick={handleSubmit}
              disabled={isThinking}
              className="w-9 h-9 rounded-full bg-calm-500 text-white flex items-center justify-center flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
