import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BreathingPage from './pages/BreathingPage';
import GroundingPage from './pages/GroundingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/guide/breathing-:type" element={<BreathingPage />} />
        <Route path="/guide/grounding-:type" element={<GroundingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
