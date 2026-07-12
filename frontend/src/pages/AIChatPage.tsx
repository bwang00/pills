import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recommendedGuide?: string;
}

export default function AIChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好，我是 Pills AI 助手。告诉我你现在的感受，我会为你推荐合适的放松方式。' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleVoiceResult = (text: string) => {
    if (text.trim()) {
      setInput(text.trim());
    }
  };
  const { isListening, transcript, error: voiceError, startListening, stopListening, supported } = useVoiceInput(handleVoiceResult);

  useEffect(() => {
    if (isListening && transcript) setInput(transcript);
  }, [isListening, transcript]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, history: newMessages.slice(0, -1) }),
      });
      const data = await res.json();
      const replyContent = data.reply || '';
      const recommendedSlug = data.recommended_guide;
      setMessages([...newMessages, { role: 'assistant', content: replyContent, recommendedGuide: recommendedSlug || undefined }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '抱歉，我暂时无法回复。请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="AI 对话">
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-calm-500 text-white rounded-br-sm'
                  : 'bg-white border border-calm-100 text-calm-800 rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {/* Guide recommendation link */}
                {msg.role === 'assistant' && msg.recommendedGuide && (
                  <button
                    onClick={() => navigate(`/guide/${msg.recommendedGuide}`)}
                    className="mt-2 text-calm-500 underline text-sm"
                  >
                    点击开始引导
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-calm-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-calm-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-calm-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-calm-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {voiceError && (
          <div className="text-center text-red-400 text-xs py-1">{voiceError}</div>
        )}

        {/* Input area */}
        <div className="flex gap-2 pt-2 pb-4 border-t border-calm-100 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isListening ? '正在听你说…' : '告诉我你现在的感受…'}
            className="flex-1 rounded-full border border-calm-200 px-4 py-3 text-calm-800 placeholder:text-calm-300 focus:outline-none focus:border-calm-400 transition-colors"
            disabled={loading || isListening}
          />
          {supported && (
            <button
              onClick={() => isListening ? stopListening() : startListening()}
              disabled={loading}
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isListening ? 'bg-red-500 text-white scale-110' : 'bg-calm-100 text-calm-500'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          )}
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-full bg-calm-500 text-white px-6 py-3 font-semibold hover:bg-calm-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </Layout>
  );
}
