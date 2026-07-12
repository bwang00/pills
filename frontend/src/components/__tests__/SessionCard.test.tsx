import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SessionCard from '../SessionCard';

const mockGuides = [
  { id: '1', slug: 'breathing-478', title: '4-7-8 呼吸法', description: '', category: 'breathing' as const, config: { phases: [] }, sort_order: 1 },
];

it('renders guide title and formatted date', () => {
  const session = {
    id: 's1',
    guide_slug: 'breathing-478',
    started_at: '2026-07-12T03:05:00Z',
    completed_at: '2026-07-12T03:10:00Z',
    duration_seconds: 300,
  };

  render(<SessionCard session={session} guides={mockGuides} />);
  expect(screen.getByText('4-7-8 呼吸法')).toBeTruthy();
  expect(screen.getByText((content) => content.includes('5') && content.includes('分钟'))).toBeTruthy();
});

it('shows 进行中 for incomplete session', () => {
  const session = {
    id: 's2',
    guide_slug: 'breathing-478',
    started_at: '2026-07-12T03:05:00Z',
    completed_at: null,
    duration_seconds: null,
  };

  render(<SessionCard session={session} guides={mockGuides} />);
  expect(screen.getAllByText('进行中').length).toBeGreaterThan(0);
});

it('falls back to slug when guide not found', () => {
  const session = {
    id: 's3',
    guide_slug: 'unknown-guide',
    started_at: '2026-07-12T03:05:00Z',
    completed_at: '2026-07-12T03:10:00Z',
    duration_seconds: 120,
  };

  render(<SessionCard session={session} guides={mockGuides} />);
  expect(screen.getByText('unknown-guide')).toBeTruthy();
});
