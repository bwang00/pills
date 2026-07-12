import { Link } from 'react-router-dom';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-calm-50 to-calm-100 overflow-hidden">
      <header className="px-6 py-3 flex-shrink-0">
        <Link to="/" className="text-calm-700 font-semibold text-lg hover:text-calm-900 transition-colors">
          Pills
        </Link>
        <span className="ml-3 text-calm-400 text-sm">/ 聊天</span>
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
