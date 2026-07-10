export interface GuidePhase {
  name: string;
  duration: number;
}

export interface GroundingStep {
  sense: string;
  count: number;
  prompt: string;
}

export interface MuscleRelaxStep {
  body_part: string;
  tense_duration: number;
  relax_duration: number;
  tense_prompt: string;
  relax_prompt: string;
}

export interface MeditationPrompt {
  time_pct: number;
  text: string;
}

export interface BreathingConfig {
  phases: GuidePhase[];
}

export interface GroundingConfig {
  steps: GroundingStep[];
}

export interface MuscleRelaxConfig {
  steps: MuscleRelaxStep[];
}

export interface MindfulnessConfig {
  duration_minutes: number;
  prompts: MeditationPrompt[];
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'breathing' | 'grounding' | 'muscle_relax' | 'mindfulness';
  config: BreathingConfig | GroundingConfig | MuscleRelaxConfig | MindfulnessConfig;
  sort_order: number;
}

export interface SessionNote {
  step: number;
  text: string;
}
