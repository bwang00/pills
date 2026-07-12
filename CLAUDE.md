# Pills - AI Agent Instructions

## Superpowers Workflow

This project uses [Superpowers](./.superpowers/superpowers/) for structured development.

**Before doing ANY work**, check if a skill applies. Skills are in `.superpowers/superpowers/skills/`.

### Core Skills

| When | Skill |
|------|-------|
| Starting any feature/bugfix | `brainstorming` — explore intent, propose approaches, get design approval |
| Have a spec, need to implement | `writing-plans` — create step-by-step implementation plan |
| Writing code | `test-driven-development` — red/green/refactor cycle |
| About to claim "done" | `verification-before-completion` — run tests, prove it works |
| Reviewing code | `requesting-code-review` / `receiving-code-review` |
| Debugging | `systematic-debugging` — structured investigation |

### Workflow

```
brainstorming → writing-plans → test-driven-development → verification-before-completion
```

1. **Brainstorm** — Understand what we're building. Ask questions. Propose 2-3 approaches. Get design approval.
2. **Plan** — Write implementation plan with bite-sized tasks. Each task has its own test cycle.
3. **Implement** — TDD. Write failing test first. Minimal code to pass. Refactor. Commit.
4. **Verify** — Run tests. Check output. Only claim done with evidence.

### Key Rules

- **No code without a failing test first** (unless throwaway prototype)
- **No completion claims without fresh verification** (run the tests, show the output)
- **One question at a time** during brainstorming
- **YAGNI** — remove unnecessary features
- **Small commits** — each task is independently testable

### Skill Locations

All skills: `.superpowers/superpowers/skills/`

- `brainstorming/SKILL.md`
- `writing-plans/SKILL.md`
- `test-driven-development/SKILL.md`
- `verification-before-completion/SKILL.md`
- `systematic-debugging/SKILL.md`
- `requesting-code-review/SKILL.md`
- `receiving-code-review/SKILL.md`
- `subagent-driven-development/SKILL.md`
- `executing-plans/SKILL.md`
- `dispatching-parallel-agents/SKILL.md`
- `finishing-a-development-branch/SKILL.md`
- `using-git-worktrees/SKILL.md`
- `writing-skills/SKILL.md`
- `using-superpowers/SKILL.md`

## Project Context

Pills is a wellness/mental health app with:
- **Frontend**: React + TypeScript + Vite + Tailwind
- **Backend**: Python serverless APIs on Vercel
- **Database**: Supabase (PostgreSQL)
- **AI**: Qwen via DashScope API
- **Audio**: Web Audio API + edge-tts

Key features:
- AI Coach chat with voice input
- Breathing exercises (4-7-8, box breathing)
- Grounding (5-4-3-2-1 sensory)
- Muscle relaxation
- Mindfulness meditation with voice prompts

## Code Standards

- TypeScript strict mode
- Python type hints
- Input validation on all API endpoints
- CORS restricted to allowlisted origins
- No secrets in error messages
