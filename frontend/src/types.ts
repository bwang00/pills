export interface GuidePhase {
  name: string;
  duration: number;
}

export interface GroundingStep {
  sense: string;
  count: number;
  prompt: string;
}

export interface BreathingConfig {
  phases: GuidePhase[];
}

export interface GroundingConfig {
  steps: GroundingStep[];
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'breathing' | 'grounding';
  config: BreathingConfig | GroundingConfig;
  sort_order: number;
}

export interface SessionNote {
  step: number;
  text: string;
}
