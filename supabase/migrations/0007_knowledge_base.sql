-- Psychology knowledge base table (no pgvector needed, uses LLM-based retrieval)
create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  topic text not null,
  content text not null,
  created_at timestamptz not null default now()
);
