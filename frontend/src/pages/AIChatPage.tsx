import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import ConversationList from '../components/ConversationList';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '嘿，最近怎么样？想聊点什么吗？' },
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

  // Extract tags when leaving the page or switching conversations
  useEffect(() => {
    return () => {
      if (conversationId && messages.length > 1) {
        navigator.sendBeacon(`/api/conversations/${conversationId}/extract-tags`);
      }
    };
  }, [conversationId, messages]);

  const handleNewConversation = async () => {
    // Extract tags for current conversation before creating new one
    if (conversationId && messages.length > 1) {
      try {
        await fetch(`/api/conversations/${conversationId}/extract-tags`, { method: 'POST' });
      } catch (e) {
        console.error('Failed to extract tags:', e);
      }
    }
    setConversationId(null);
    setMessages([
      { role: 'assistant', content: '嘿，最近怎么样？想聊点什么吗？' },
    ]);
  };

  const handleSelectConversation = async (id: string) => {
    // Extract tags for current conversation before loading new one
    if (conversationId && messages.length > 1) {
      try {
        await fetch(`/api/conversations/${conversationId}/extract-tags`, { method: 'POST' });
      } catch (e) {
        console.error('Failed to extract tags:', e);
      }
    }
    
    try {
      const response = await fetch(`/api/conversations/${id}`);
      const data = await response.json();
      setConversationId(id);
      setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Create conversation if needed
    let currentConvId = conversationId;
    if (!currentConvId) {
      try {
        const response = await fetch('/api/conversations', { method: 'POST' });
        const data = await response.json();
        currentConvId = data.id;
        setConversationId(currentConvId);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    }

    // Save user message
    if (currentConvId) {
      try {
        await fetch(`/api/conversations/${currentConvId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: userMsg.content }),
        });
      } catch (error) {
        console.error('Failed to save user message:', error);
      }
    }

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, history: newMessages.slice(0, -1) }),
      });
      const data = await res.json();
      const replyContent = data.reply || '';
      const assistantMsg: Message = { role: 'assistant', content: replyContent };
      setMessages([...newMessages, assistantMsg]);

      // Save assistant message
      if (currentConvId) {
        try {
          await fetch(`/api/conversations/${currentConvId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'assistant', content: replyContent }),
          });
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '抱歉，我这边暂时有点问题。你能再说一次吗？' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="聊天">
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left: Conversation Area (70%) */}
        <div className="w-7/10 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 py-4 px-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-calm-500 text-white rounded-br-sm'
                    : 'bg-white border border-calm-100 text-calm-800 rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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

          <div className="flex gap-2 pt-2 pb-4 px-4 border-t border-calm-100 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={isListening ? '正在听你说…' : '想聊点什么？'}
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

        {/* Right: Conversation List (30%) */}
        <div className="w-3/10">
          <ConversationList
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            selectedConversationId={conversationId}
          />
        </div>
      </div>
    </Layout>
  );
}
