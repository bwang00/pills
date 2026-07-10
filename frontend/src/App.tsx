import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import GuidePage from './pages/GuidePage';
import AIChatPage from './pages/AIChatPage';
import DebugPage from './pages/DebugPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/guide/:slug" element={<GuidePage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />
          <Route path="/debug" element={<DebugPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
