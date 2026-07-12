-- Phase 2: Add conversation tags for AI chat

create table if not exists conversation_tags (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_tags_tag on conversation_tags(tag);
create index if not exists idx_conversation_tags_conversation_id on conversation_tags(conversation_id);

-- Unique constraint: no duplicate tags per conversation
create unique index if not exists idx_conversation_tags_unique on conversation_tags(conversation_id, tag);
