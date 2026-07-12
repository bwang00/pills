-- Phase 3: Add conversation persistence for AI chat

create extension if not exists "pgcrypto";

-- Conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conversation messages table
create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_conversations_updated_at on conversations(updated_at desc);
create index if not exists idx_conversation_messages_conversation_id on conversation_messages(conversation_id);
create index if not exists idx_conversation_messages_created_at on conversation_messages(created_at);

-- Function to update conversations.updated_at when messages are added
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update conversations 
  set updated_at = now() 
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger trigger_update_conversation_timestamp
  after insert on conversation_messages
  for each row
  execute function update_conversation_timestamp();
