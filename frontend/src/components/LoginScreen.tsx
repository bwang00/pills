import { useState } from 'react';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem('pills_username', username.trim());
      onLogin(username.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-calm-50 to-calm-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💬</div>
          <h1 className="text-2xl font-bold text-calm-900 mb-2">Pills 心理聊天</h1>
          <p className="text-calm-600 text-sm">输入你的名字开始聊天</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-calm-700 mb-2">
              你的名字
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入名字..."
              className="w-full px-4 py-3 border border-calm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-calm-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full px-4 py-3 bg-calm-500 text-white rounded-lg hover:bg-calm-600 disabled:bg-calm-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            开始聊天
          </button>
        </form>
      </div>
    </div>
  );
}
