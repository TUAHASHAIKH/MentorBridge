-- MentorBridge Database Schema - All SQL queries executed so far
-- Last Updated: April 27, 2026

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table mentor_profiles enable row level security;
alter table mentor_session_types enable row level security;
alter table sessions enable row level security;
alter table pre_session_briefs enable row level security;
alter table session_reviews enable row level security;
alter table action_items enable row level security;
alter table sifarish_vouches enable row level security;

-- Profiles: users see their own, public fields visible to all
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Sessions: student sees their own, mentor sees theirs
create policy "Students see own sessions" on sessions for select
  using (auth.uid() = student_id);
create policy "Mentors see own sessions" on sessions for select
  using (auth.uid() = (select user_id from mentor_profiles where id = mentor_id));

-- Pre-session briefs: only visible to the session's student and mentor
create policy "Brief visible to session parties" on pre_session_briefs for select
  using (
    session_id in (
      select id from sessions
      where student_id = auth.uid()
      or mentor_id = (select id from mentor_profiles where user_id = auth.uid())
    )
  );

-- Sifarish vouches: public ones visible to all, private only to involved parties
create policy "Public vouches visible to all" on sifarish_vouches for select
  using (is_public = true or student_id = auth.uid());

-- Auth trigger: Auto-create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'student'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Admin authentication support tables
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

-- Admin audit logs
create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid references profiles(id) on delete set null,
  action text not null,
  target_user_id uuid references profiles(id) on delete set null,
  target_email text not null,
  created_at timestamptz not null default now()
);

alter table admin_login_attempts enable row level security;
alter table admin_sessions enable row level security;
alter table admin_audit_logs enable row level security;

-- No RLS policies on admin tables. Access is via server-side routes with service role key only.

-- 1. Extend mentor_profiles for application review
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS application_bio TEXT;
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS application_qualifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS years_of_experience INT;
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS expertise_areas TEXT[];
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
-- NOTE: skip approved_by, approved_at, status — already exist

-- 2. Flagging & removal (separate concerns from approval)
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS flag_description TEXT;
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES profiles(id);
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS is_removed BOOLEAN DEFAULT FALSE;
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS removed_reason TEXT;
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES profiles(id);
ALTER TABLE mentor_profiles ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- 3. User account management
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' 
  CHECK (account_status IN ('active', 'suspended', 'banned'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes JSONB DEFAULT '[]'::jsonb;

-- 4. Sifarish vouch integrity
ALTER TABLE sifarish_vouches ADD COLUMN IF NOT EXISTS vouch_status TEXT DEFAULT 'active'
  CHECK (vouch_status IN ('active', 'verified', 'flagged', 'revoked'));
ALTER TABLE sifarish_vouches ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);
ALTER TABLE sifarish_vouches ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE sifarish_vouches ADD COLUMN IF NOT EXISTS is_fraud_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE sifarish_vouches ADD COLUMN IF NOT EXISTS fraud_flagged_by UUID REFERENCES profiles(id);
ALTER TABLE sifarish_vouches ADD COLUMN IF NOT EXISTS fraud_flagged_at TIMESTAMPTZ;

-- 5. Session type approvals (junction table)
CREATE TABLE IF NOT EXISTS mentor_approved_session_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  session_type_id UUID NOT NULL REFERENCES mentor_session_types(id) ON DELETE CASCADE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  restricted_reason TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  UNIQUE(mentor_id, session_type_id)
);

-- 6. Analytics cache
CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value INT DEFAULT 0,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(metric_name, recorded_at)
);

-- 7. Audit log (missing from the other LLM's plan)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. RLS on new tables
ALTER TABLE mentor_approved_session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs and analytics
CREATE POLICY "Admin only audit logs" ON admin_audit_logs FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admin only analytics" ON platform_analytics FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );