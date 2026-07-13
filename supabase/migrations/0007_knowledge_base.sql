-- Enable pgvector extension for vector similarity search
create extension if not exists vector;

-- Psychology knowledge base table
create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  topic text not null,
  content text not null,
  embedding vector(1024),
  created_at timestamptz not null default now()
);

-- Index for fast vector similarity search (cosine distance)
create index if not exists knowledge_base_embedding_idx
  on knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- Function for similarity search
create or replace function search_knowledge(query_embedding vector(1024), match_count int default 3)
returns table (
  id uuid,
  category text,
  topic text,
  content text,
  similarity float
)
language sql
as $$
  select
    id,
    category,
    topic,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from knowledge_base
  order by embedding <=> query_embedding
  limit match_count;
$$;
