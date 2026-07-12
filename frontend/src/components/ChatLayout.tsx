import { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface ChatLayoutProps {
  children: React.ReactNode;
  username?: string;
}

export default function ChatLayout({ children, username }: ChatLayoutProps) {
  // Lock body scroll on mount, restore on unmount
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className="bg-gradient-to-b from-calm-50 to-calm-100"
    >
      <header style={{ flexShrink: 0 }} className="px-6 py-3 border-b border-calm-100 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="text-calm-700 font-semibold text-lg hover:text-calm-900 transition-colors">
            Pills
          </Link>
          <span className="ml-3 text-calm-400 text-sm">/ 聊天</span>
        </div>
        {username && (
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-calm-400 text-white text-xs font-semibold flex items-center justify-center">
              {username.charAt(0).toUpperCase()}
            </span>
            <span className="text-calm-600 text-sm font-medium">{username}</span>
          </div>
        )}
      </header>
      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
