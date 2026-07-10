import { useParams } from 'react-router-dom';
import BreathingPage from './BreathingPage';
import GroundingPage from './GroundingPage';
import MuscleRelaxPage from './MuscleRelaxPage';
import MindfulnessPage from './MindfulnessPage';

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <div className="text-center py-16 text-calm-400">未找到引导</div>;
  if (slug.startsWith('breathing')) return <BreathingPage />;
  if (slug.startsWith('grounding')) return <GroundingPage />;
  if (slug.startsWith('muscle-relax')) return <MuscleRelaxPage />;
  if (slug.startsWith('mindfulness')) return <MindfulnessPage />;
  return <div className="text-center py-16 text-calm-400">未找到引导: {slug}</div>;
}
