-- Admin authentication support tables for MentorBridge
-- Run this in Supabase SQL editor after your base schema.

create table if not exists admin_login_attempts (
  email text primary key,
  failed_count int not null default 0 check (failed_count >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  token_hash text unique not null,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_admin_sessions_user_id on admin_sessions(user_id);
create index if not exists idx_admin_sessions_last_activity on admin_sessions(last_activity_at);

alter table admin_login_attempts enable row level security;
alter table admin_sessions enable row level security;

-- No RLS policies are created here. App access is intentionally via server-side
-- routes using the service role key only.
