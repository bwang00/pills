import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import BreathingPage from './pages/BreathingPage';
import GroundingPage from './pages/GroundingPage';
import MuscleRelaxPage from './pages/MuscleRelaxPage';
import MindfulnessPage from './pages/MindfulnessPage';
import AIChatPage from './pages/AIChatPage';
import DebugPage from './pages/DebugPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/guide/breathing-*" element={<BreathingPage />} />
          <Route path="/guide/grounding-*" element={<GroundingPage />} />
          <Route path="/guide/muscle-relax-*" element={<MuscleRelaxPage />} />
          <Route path="/guide/mindfulness-*" element={<MindfulnessPage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />
          <Route path="/debug" element={<DebugPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
