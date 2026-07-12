# 快速肌肉放松升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade muscle relax experience with voice guidance, ocean background music, body map animations, and progress visualization.

**Architecture:** Extend existing `useAudio` hook with muscle-relax-specific voice files and ocean ambient sound. Add phase transition callbacks to `useMuscleRelax` hook. Build animated body map with SVG glow effects and a progress bar component.

**Tech Stack:** React + TypeScript, Web Audio API, SVG + CSS animations, edge-tts (for voice generation)

## Global Constraints

- Reuse existing audio patterns from breathing exercises
- Audio playback failures must be silent (don't block exercise)
- Use existing `calm-*` Tailwind color palette
- Ocean bg music: volume 0.25, 3s fade in, 2s fade out
- Voice files: pre-generated MP3s in `frontend/public/audio/`
- Body map: SVG filter glow + CSS pulse animation
- Progress: top bar + bottom dots (keep both)

---

### Task 1: Generate Voice Audio Files

**Files:**
- Create: `scripts/generate-mr-voices.py`
- Create: `frontend/public/audio/voice-mr-tense-肩膀.mp3` (and 9 more)

**Interfaces:**
- Consumes: edge-tts library
- Produces: 10 MP3 voice files in `frontend/public/audio/`

- [ ] **Step 1: Create voice generation script**

Create `scripts/generate-mr-voices.py`:

```python
"""Generate voice prompts for muscle relax exercises."""
import asyncio
import edge_tts
import os

VOICE = "zh-CN-XiaoxiaoNeural"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "audio")

# Quick muscle relax: 5 body parts × 2 phases
PROMPTS = {
    "tense": {
        "肩膀": "收紧你的肩膀，向上提起",
        "手臂": "握紧拳头，收紧手臂",
        "腹部": "收紧腹部肌肉",
        "大腿": "收紧大腿肌肉",
        "双脚": "绷紧脚趾，收紧双脚",
    },
    "relax": {
        "肩膀": "放松肩膀，让它们自然下沉",
        "手臂": "松开拳头，让手臂完全放松",
        "腹部": "放松腹部，感受柔软",
        "大腿": "放松大腿，感受沉重",
        "双脚": "放松双脚，感受温暖",
    },
}

async def generate_voice(text: str, filename: str):
    communicate = edge_tts.Communicate(text, VOICE, rate="-10%", pitch="+5Hz")
    filepath = os.path.join(OUTPUT_DIR, filename)
    await communicate.save(filepath)
    print(f"Generated: {filename}")

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    tasks = []
    for phase, parts in PROMPTS.items():
        for part, text in parts.items():
            filename = f"voice-mr-{phase}-{part}.mp3"
            tasks.append(generate_voice(text, filename))
    await asyncio.gather(*tasks)
    print(f"Done! Generated {len(tasks)} voice files.")

if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: Run the script to generate voice files**

Run: `cd ~/pills && python3 scripts/generate-mr-voices.py`
Expected: 10 MP3 files generated in `frontend/public/audio/`

- [ ] **Step 3: Verify files exist**

Run: `ls ~/pills/frontend/public/audio/voice-mr-*.mp3 | wc -l`
Expected: `10`

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-mr-voices.py frontend/public/audio/voice-mr-*.mp3
git commit -m "feat: generate muscle relax voice prompts"
```

---

### Task 2: Source Ocean Ambient Audio

**Files:**
- Create: `frontend/public/audio/ambient-ocean.wav`

**Interfaces:**
- Consumes: free ocean sound source or generation
- Produces: loopable ocean ambient audio file

- [ ] **Step 1: Download or generate ocean ambient sound**

Option A: Download from freesound.org (requires attribution)
Option B: Generate using Python (white noise + low-pass filter for ocean-like sound)

Create `scripts/generate-ocean-sound.py`:

```python
"""Generate ocean-like ambient sound."""
import numpy as np
import soundfile as sf
import os

SAMPLE_RATE = 44100
DURATION = 30  # seconds, will loop

def generate_ocean(duration, sr):
    """Generate ocean-wave-like sound using filtered noise."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # White noise base
    noise = np.random.randn(len(t))
    
    # Low-pass filter (simple moving average)
    kernel_size = int(sr * 0.1)  # 100ms window
    kernel = np.ones(kernel_size) / kernel_size
    filtered = np.convolve(noise, kernel, mode='same')
    
    # Add wave rhythm (0.1 Hz = one wave every 10 seconds)
    wave_envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * t)
    
    # Combine
    ocean = filtered * wave_envelope
    
    # Normalize
    ocean = ocean / np.max(np.abs(ocean)) * 0.8
    
    return ocean

output_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "audio")
os.makedirs(output_dir, exist_ok=True)

ocean = generate_ocean(DURATION, SAMPLE_RATE)
output_path = os.path.join(output_dir, "ambient-ocean.wav")
sf.write(output_path, ocean, SAMPLE_RATE)
print(f"Generated: {output_path}")
```

- [ ] **Step 2: Run the script**

Run: `cd ~/pills && pip3 install numpy soundfile --quiet && python3 scripts/generate-ocean-sound.py`
Expected: `ambient-ocean.wav` generated (~5MB)

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-ocean-sound.py frontend/public/audio/ambient-ocean.wav
git commit -m "feat: add ocean ambient sound for muscle relax"
```

---

### Task 3: Extend useAudio Hook

**Files:**
- Modify: `frontend/src/hooks/useAudio.ts`

**Interfaces:**
- Consumes: voice MP3 files from Task 1, ocean WAV from Task 2
- Produces: `playMrVoice(phase, bodyPart)` function, `startOceanMusic()` / `stopOceanMusic()` functions

- [ ] **Step 1: Add ocean music and muscle relax voice support**

Add to `frontend/src/hooks/useAudio.ts`:

```typescript
// Add after existing constants
const OCEAN_MUSIC_URL = '/audio/ambient-ocean.wav';
const OCEAN_MUSIC_VOL = 0.25;

// Add new refs inside useAudio()
const oceanSourceRef = useRef<AudioBufferSourceNode | null>(null);
const oceanGainRef = useRef<GainNode | null>(null);

// Add new functions inside useAudio()
const startOceanMusic = useCallback(async () => {
  try {
    const ctx = await getCtx();
    if (oceanSourceRef.current) {
      try { oceanSourceRef.current.stop(); } catch {}
      oceanSourceRef.current = null;
    }
    const buffer = await loadBuffer(ctx, OCEAN_MUSIC_URL);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(OCEAN_MUSIC_VOL, now + 3);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    oceanSourceRef.current = source;
    oceanGainRef.current = gain;
  } catch (e) {
    console.warn('[Audio] startOceanMusic failed:', e);
  }
}, [getCtx, loadBuffer]);

const stopOceanMusic = useCallback(() => {
  const ctx = ctxRef.current;
  const gain = oceanGainRef.current;
  const source = oceanSourceRef.current;
  if (ctx && source && gain) {
    try {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 2);
      source.stop(now + 2.1);
    } catch {}
  }
  oceanSourceRef.current = null;
  oceanGainRef.current = null;
}, []);

const playMrVoice = useCallback(async (phase: 'tense' | 'relax', bodyPart: string) => {
  const url = `/audio/voice-mr-${phase}-${bodyPart}.mp3`;
  try {
    const ctx = await getCtx();
    if (promptSourceRef.current) {
      try { promptSourceRef.current.stop(); } catch {}
      promptSourceRef.current = null;
    }
    const buffer = await loadBuffer(ctx, url);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(PROMPT_VOL, ctx.currentTime);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    promptSourceRef.current = source;
    // Duck ocean music while voice plays
    if (oceanGainRef.current && ctxRef.current) {
      const now = ctxRef.current.currentTime;
      oceanGainRef.current.gain.cancelScheduledValues(now);
      oceanGainRef.current.gain.setValueAtTime(oceanGainRef.current.gain.value, now);
      oceanGainRef.current.gain.linearRampToValueAtTime(0.08, now + 0.3);
      const restoreTime = now + buffer.duration + 0.3;
      oceanGainRef.current.gain.linearRampToValueAtTime(OCEAN_MUSIC_VOL, restoreTime);
    }
  } catch (e) {
    console.warn('[Audio] playMrVoice failed:', phase, bodyPart, e);
  }
}, [getCtx, loadBuffer]);

// Add to cleanup useEffect
useEffect(() => {
  return () => {
    try { oceanSourceRef.current?.stop(); } catch {}
    // ... existing cleanup
  };
}, []);

// Add to return object
return { ..., startOceanMusic, stopOceanMusic, playMrVoice };
```

- [ ] **Step 2: Verify build passes**

Run: `cd ~/pills/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useAudio.ts
git commit -m "feat: add ocean music and muscle relax voice to useAudio"
```

---

### Task 4: Update useMuscleRelax Hook with Callbacks

**Files:**
- Modify: `frontend/src/hooks/useMuscleRelax.ts`

**Interfaces:**
- Consumes: callback functions for phase changes
- Produces: `onPhaseChange` callback triggered on each phase transition

- [ ] **Step 1: Add onPhaseChange callback support**

Modify `frontend/src/hooks/useMuscleRelax.ts`:

```typescript
interface UseMuscleRelaxOptions {
  onPhaseChange?: (phase: MusclePhase, stepIndex: number) => void;
}

export function useMuscleRelax(steps: MuscleStep[], options?: UseMuscleRelaxOptions) {
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  // In the tick function, when phase changes:
  // After setPhase('relax'):
  optionsRef.current?.onPhaseChange?.('relax', currentStepIndex);
  
  // After advanceStep -> setPhase('tense'):
  optionsRef.current?.onPhaseChange?.('tense', nextStepIndex);
  
  // When state becomes 'completed':
  optionsRef.current?.onPhaseChange?.('completed', -1);
  
  // ... rest of existing code
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd ~/pills/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useMuscleRelax.ts
git commit -m "feat: add onPhaseChange callback to useMuscleRelax"
```

---

### Task 5: Integrate Audio into MuscleRelaxPage

**Files:**
- Modify: `frontend/src/pages/MuscleRelaxPage.tsx`

**Interfaces:**
- Consumes: `startOceanMusic`, `stopOceanMusic`, `playMrVoice` from useAudio
- Consumes: `onPhaseChange` callback from useMuscleRelax

- [ ] **Step 1: Wire up audio playback**

Modify `frontend/src/pages/MuscleRelaxPage.tsx`:

```typescript
// Add to imports
const { playBell, unlockAudio, startOceanMusic, stopOceanMusic, playMrVoice, playVoice } = useAudio();

// Create phase change handler
const handlePhaseChange = useCallback((phase: MusclePhase, stepIndex: number) => {
  if (phase === 'tense' && stepIndex >= 0) {
    playMrVoice('tense', steps[stepIndex]?.body_part || '');
  } else if (phase === 'relax' && stepIndex >= 0) {
    playMrVoice('relax', steps[stepIndex]?.body_part || '');
  } else if (phase === 'completed') {
    playBell();
    playVoice('finish');
  }
}, [playMrVoice, playBell, playVoice, steps]);

// Pass to useMuscleRelax
const { state, currentStepIndex, phase, timeRemaining, progress, start, stop } = useMuscleRelax(steps, { onPhaseChange: handlePhaseChange });

// Update handleStart
const handleStart = async () => {
  await unlockAudio();
  setShowIntro(false);
  await startSession();
  startOceanMusic();
  playBell();
  playVoice('start');
  start();
};

// Update stop handler
const handleStop = () => {
  stopOceanMusic();
  stop();
};

// Update completion useEffect
useEffect(() => {
  if (state === 'completed') {
    stopOceanMusic();
    completeSession();
  }
}, [state, completeSession, stopOceanMusic]);
```

- [ ] **Step 2: Verify build passes**

Run: `cd ~/pills/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/MuscleRelaxPage.tsx
git commit -m "feat: integrate ocean music and voice prompts into muscle relax"
```

---

### Task 6: Body Map SVG Animation

**Files:**
- Modify: `frontend/src/pages/MuscleRelaxPage.tsx` (body map section)
- Create: `frontend/src/components/BodyMap.tsx`

**Interfaces:**
- Consumes: `currentStep.body_part`, `phase` ('tense' | 'relax')
- Produces: Animated SVG body map with glow effects

- [ ] **Step 1: Create BodyMap component**

Create `frontend/src/components/BodyMap.tsx`:

```tsx
import { useMemo } from 'react';

interface BodyMapProps {
  currentBodyPart: string;
  phase: 'tense' | 'relax' | 'transition' | 'idle' | 'completed';
}

const bodyPartPaths: Record<string, string> = {
  '额头': 'M70 25 Q100 10 130 25 Q130 40 100 42 Q70 40 70 25Z',
  '下巴': 'M80 55 Q100 70 120 55 Q120 68 100 72 Q80 68 80 55Z',
  '肩膀': 'M45 90 Q60 82 80 88 M120 88 Q140 82 155 90 L155 100 Q140 95 120 98 M80 98 Q60 95 45 100Z',
  '手臂': 'M30 105 Q35 100 45 100 L45 155 Q35 160 30 155Z M155 100 Q165 100 170 105 L170 155 Q165 160 155 155Z',
  '腹部': 'M75 120 Q100 115 125 120 L125 155 Q100 160 75 155Z',
  '背部': 'M70 95 Q100 90 130 95 L130 130 Q100 135 70 130Z',
  '大腿': 'M70 165 L85 165 L82 215 L68 215Z M115 165 L130 165 L132 215 L118 215Z',
  '双脚': 'M65 220 L85 220 L85 235 Q75 240 65 235Z M115 220 L135 220 L135 235 Q125 240 115 235Z',
};

export default function BodyMap({ currentBodyPart, phase }: BodyMapProps) {
  const glowColor = phase === 'tense' ? '#f97316' : '#7cb8d4';
  const isActive = phase === 'tense' || phase === 'relax';

  return (
    <div className="relative w-48 h-64 mx-auto mb-4">
      <svg viewBox="0 0 200 250" className="w-full h-full">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Body outline */}
        <ellipse cx="100" cy="35" rx="28" ry="32" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="65" y="68" width="70" height="95" rx="12" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="30" y="75" width="22" height="80" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="148" y="75" width="22" height="80" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="72" y="165" width="22" height="60" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        <rect x="106" y="165" width="22" height="60" rx="10" fill="#f0f4f8" stroke="#d0dbe6" strokeWidth="1.5" />
        
        {/* Body parts with animation */}
        {Object.entries(bodyPartPaths).map(([part, d]) => {
          const isCurrent = part === currentBodyPart;
          return (
            <path
              key={part}
              d={d}
              fill={isCurrent && isActive ? glowColor : 'transparent'}
              stroke={isCurrent && isActive ? glowColor : 'transparent'}
              strokeWidth={isCurrent ? 3 : 2}
              opacity={isCurrent ? 1 : 0.3}
              filter={isCurrent && isActive ? 'url(#glow)' : undefined}
              className={isCurrent && isActive ? 'animate-pulse-glow' : ''}
              style={{ transition: 'opacity 0.5s ease, fill 0.3s ease' }}
            />
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Add pulse-glow animation to Tailwind config**

Modify `frontend/tailwind.config.js`:

```javascript
module.exports = {
  // ... existing config
  theme: {
    extend: {
      animation: {
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
    },
  },
};
```

- [ ] **Step 3: Replace inline body map in MuscleRelaxPage with BodyMap component**

In `MuscleRelaxPage.tsx`, replace the body map SVG section with:

```tsx
import BodyMap from '../components/BodyMap';

// In the running state JSX:
<BodyMap currentBodyPart={currentStep.body_part} phase={phase} />
```

- [ ] **Step 4: Verify build passes**

Run: `cd ~/pills/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/BodyMap.tsx frontend/tailwind.config.js frontend/src/pages/MuscleRelaxPage.tsx
git commit -m "feat: add animated body map with glow effects"
```

---

### Task 7: Progress Bar Component

**Files:**
- Create: `frontend/src/components/ProgressBar.tsx`
- Modify: `frontend/src/pages/MuscleRelaxPage.tsx`

**Interfaces:**
- Consumes: `steps`, `currentStepIndex`, `phase`
- Produces: Visual progress indicator

- [ ] **Step 1: Create ProgressBar component**

Create `frontend/src/components/ProgressBar.tsx`:

```tsx
interface ProgressBarProps {
  steps: { body_part: string }[];
  currentStepIndex: number;
  phase: string;
}

export default function ProgressBar({ steps, currentStepIndex, phase }: ProgressBarProps) {
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const barColor = phase === 'tense' ? 'bg-orange-400' : 'bg-calm-400';

  return (
    <div className="mb-6">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`text-xs transition-all ${
              i === currentStepIndex
                ? 'text-calm-800 font-semibold scale-110'
                : i < currentStepIndex
                ? 'text-calm-500'
                : 'text-calm-300'
            }`}
          >
            {step.body_part}
          </div>
        ))}
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-calm-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Count */}
      <p className="text-center text-calm-400 text-xs mt-1">
        {currentStepIndex + 1} / {steps.length} 个部位
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into MuscleRelaxPage**

In `MuscleRelaxPage.tsx`, add import and use in running state:

```tsx
import ProgressBar from '../components/ProgressBar';

// In the running state JSX, before the body map:
<ProgressBar steps={steps} currentStepIndex={currentStepIndex} phase={phase} />
```

- [ ] **Step 3: Verify build passes**

Run: `cd ~/pills/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProgressBar.tsx frontend/src/pages/MuscleRelaxPage.tsx
git commit -m "feat: add progress bar with step indicators"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run all frontend tests**

Run: `cd ~/pills/frontend && npx vitest run`
Expected: All tests pass (pre-existing grounding test failures are unrelated)

- [ ] **Step 2: Build frontend**

Run: `cd ~/pills/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Verify all audio files exist**

Run: `ls ~/pills/frontend/public/audio/voice-mr-*.mp3 | wc -l && ls ~/pills/frontend/public/audio/ambient-ocean.wav`
Expected: `10` and `ambient-ocean.wav` exists

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 5: Tag release**

```bash
git tag -f 0712
git push origin 0712 -f
```
