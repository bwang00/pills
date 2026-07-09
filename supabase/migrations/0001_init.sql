-- Pills schema — Phase 1
-- Run via Supabase SQL editor or `supabase db push`

create extension if not exists "pgcrypto";

-- Breathing patterns and grounding guide configurations
create table if not exists guides (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,          -- e.g. "breathing-478", "grounding-54321"
  title       text not null,                 -- 显示标题
  description text,                          -- 简短描述
  category    text not null,                 -- "breathing" | "grounding"
  config      jsonb not null default '{}',   -- 引导参数（节奏、步骤等）
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Anonymous session records (for tracking usage, no PII)
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  guide_slug  text not null,
  started_at  timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer,
  notes       jsonb default '[]'              -- 感官着陆中的用户记录
);

create index if not exists sessions_guide_idx on sessions(guide_slug);
create index if not exists sessions_started_idx on sessions(started_at desc);

-- Seed default guides
insert into guides (slug, title, description, category, config, sort_order) values
  (
    'breathing-478',
    '4-7-8 呼吸法',
    '吸气4秒，屏息7秒，呼气8秒。经典的放松呼吸技巧。',
    'breathing',
    '{"phases": [{"name": "吸气", "duration": 4}, {"name": "屏息", "duration": 7}, {"name": "呼气", "duration": 8}]}',
    1
  ),
  (
    'breathing-box',
    '方块呼吸',
    '吸气4秒，屏息4秒，呼气4秒，屏息4秒。均匀稳定的呼吸节奏。',
    'breathing',
    '{"phases": [{"name": "吸气", "duration": 4}, {"name": "屏息", "duration": 4}, {"name": "呼气", "duration": 4}, {"name": "屏息", "duration": 4}]}',
    2
  ),
  (
    'grounding-54321',
    '5-4-3-2-1 感官着陆',
    '通过五感逐步将注意力拉回当下，帮助缓解焦虑。',
    'grounding',
    '{"steps": [{"sense": "看", "count": 5, "prompt": "说出你能看到的5样东西"}, {"sense": "触摸", "count": 4, "prompt": "说出你能触摸到的4样东西"}, {"sense": "听", "count": 3, "prompt": "说出你能听到的3种声音"}, {"sense": "闻", "count": 2, "prompt": "说出你能闻到的2种气味"}, {"sense": "尝", "count": 1, "prompt": "说出你能尝到的1种味道"}]}',
    1
  )
on conflict (slug) do nothing;
