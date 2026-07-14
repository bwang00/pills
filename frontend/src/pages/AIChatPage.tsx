import { useState, useRef, useEffect } from 'react';
import ChatLayout from '../components/ChatLayout';
import ConversationList from '../components/ConversationList';
import LoginScreen from '../components/LoginScreen';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '嘿，最近怎么样？想聊点什么吗？' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('pills_username');
    if (stored) {
      setUsername(stored);
      // Auto-load the most recent conversation
      fetch(`/api/conversations?username=${encodeURIComponent(stored)}`)
        .then(r => r.json())
        .then(async (convs) => {
          if (convs.length > 0) {
            const latest = convs[0];
            const res = await fetch(`/api/conversations/${latest.id}`);
            const data = await res.json();
            setConversationId(latest.id);
            setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
          }
        })
        .catch(err => console.error('Failed to auto-load conversation:', err));
    }
  }, []);

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

  // Extract tags and profile when leaving the page or switching conversations
  useEffect(() => {
    return () => {
      if (conversationId && messages.length > 1) {
        navigator.sendBeacon(`/api/conversations/extract-tags?conversation_id=${conversationId}`);
        if (username) {
          navigator.sendBeacon(`/api/conversations/extract-profile?conversation_id=${conversationId}&username=${encodeURIComponent(username)}`);
        }
      }
    };
  }, [conversationId, messages, username]);

  const handleLogin = (name: string) => {
    setUsername(name);
  };

  if (!username) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const handleNewConversation = async () => {
    // Reset UI immediately so the button feels responsive
    const prevConvId = conversationId;
    const prevMessages = messages;
    setConversationId(null);
    setMessages([
      { role: 'assistant', content: '嘿，最近怎么样？想聊点什么吗？' },
    ]);
    setShowSidebar(false);

    // Fire-and-forget background extraction
    if (prevConvId && prevMessages.length > 1) {
      try {
        await fetch(`/api/conversations/extract-tags?conversation_id=${prevConvId}`, { method: 'POST' });
        await fetch(`/api/conversations/extract-profile?conversation_id=${prevConvId}&username=${encodeURIComponent(username)}`, { method: 'POST' });
      } catch (e) {
        console.error('Failed to extract tags/profile:', e);
      }
    }
  };

  const handleSelectConversation = async (id: string) => {
    // Save previous conversation info for background extraction
    const prevConvId = conversationId;
    const prevMessages = messages;
    setShowSidebar(false);

    // Load new conversation immediately
    try {
      const response = await fetch(`/api/conversations/${id}`);
      const data = await response.json();
      setConversationId(id);
      setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }

    // Fire-and-forget background extraction for previous conversation
    if (prevConvId && prevConvId !== id && prevMessages.length > 1) {
      try {
        await fetch(`/api/conversations/extract-tags?conversation_id=${prevConvId}`, { method: 'POST' });
        await fetch(`/api/conversations/extract-profile?conversation_id=${prevConvId}&username=${encodeURIComponent(username)}`, { method: 'POST' });
      } catch (e) {
        console.error('Failed to extract tags/profile:', e);
      }
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
        const response = await fetch(`/api/conversations?username=${encodeURIComponent(username)}`, { method: 'POST' });
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
        await fetch(`/api/conversations/messages?conversation_id=${currentConvId}`, {
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
        body: JSON.stringify({ message: userMsg.content, history: newMessages.slice(0, -1), username }),
      });
      const data = await res.json();
      const replyContent = data.reply || '';
      const assistantMsg: Message = { role: 'assistant', content: replyContent };
      setMessages([...newMessages, assistantMsg]);

      // Save assistant message
      if (currentConvId) {
        try {
          await fetch(`/api/conversations/messages?conversation_id=${currentConvId}`, {
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
    <ChatLayout username={username}>
      <div className="flex h-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile: sidebar toggle button */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-calm-100 md:hidden">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center gap-2 text-calm-600 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
              历史对话
            </button>
          </div>

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

        {/* Desktop: Right sidebar (30%) */}
        <div className="hidden md:flex md:w-80 md:flex-shrink-0">
          <ConversationList
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            selectedConversationId={conversationId}
            username={username}
          />
        </div>
      </div>

      {/* Mobile: Slide-over sidebar */}
      {showSidebar && (
        <div className="fixed inset-x-0 top-0 bottom-0 z-50 md:hidden h-[100dvh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowSidebar(false)}
          />
          {/* Sidebar panel */}
          <div className="absolute right-0 top-0 w-80 max-w-[85vw] bg-white shadow-xl flex flex-col h-[100dvh]">
            <div className="flex items-center justify-between p-3 border-b border-calm-100 flex-shrink-0">
              <span className="text-calm-700 font-medium text-sm">历史对话</span>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-calm-400 hover:text-calm-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <ConversationList
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                selectedConversationId={conversationId}
                username={username}
              />
            </div>
          </div>
        </div>
      )}
    </ChatLayout>
  );
}
