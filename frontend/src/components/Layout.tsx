import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-calm-50 to-calm-100">
      <header className="px-6 py-4">
        <Link to="/" className="text-calm-700 font-semibold text-lg hover:text-calm-900 transition-colors">
          Pills
        </Link>
        {title && (
          <span className="ml-3 text-calm-400 text-sm">/ {title}</span>
        )}
      </header>
      <main className="px-4 pb-12 max-w-lg mx-auto">
        {children}
      </main>
    </div>
  );
}
