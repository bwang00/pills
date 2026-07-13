-- User profiles table: stores AI-generated user profile summaries
-- extracted from conversation history. One row per username.

create table if not exists user_profiles (
  username text primary key,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to auto-update updated_at
create or replace function update_user_profile_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger user_profiles_updated_at
  before update on user_profiles
  for each row
  execute function update_user_profile_timestamp();
