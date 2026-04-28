-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.action_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  assigned_to uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'overdue'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT action_items_pkey PRIMARY KEY (id),
  CONSTRAINT action_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT action_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);
CREATE TABLE public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_admin_id uuid,
  action text NOT NULL,
  target_user_id uuid,
  target_email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_logs_actor_admin_id_fkey FOREIGN KEY (actor_admin_id) REFERENCES public.profiles(id),
  CONSTRAINT admin_audit_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.admin_login_attempts (
  email text NOT NULL,
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  locked_until timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_login_attempts_pkey PRIMARY KEY (email)
);
CREATE TABLE public.admin_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  CONSTRAINT admin_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT admin_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.mentor_approved_session_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  session_type_id uuid NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  restricted_reason text,
  approved_by uuid,
  approved_at timestamp with time zone,
  CONSTRAINT mentor_approved_session_types_pkey PRIMARY KEY (id),
  CONSTRAINT mentor_approved_session_types_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(id),
  CONSTRAINT mentor_approved_session_types_session_type_id_fkey FOREIGN KEY (session_type_id) REFERENCES public.mentor_session_types(id),
  CONSTRAINT mentor_approved_session_types_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.mentor_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  bio text,
  department text,
  year_of_study text,
  linkedin_url text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])),
  approved_by uuid,
  approved_at timestamp with time zone,
  avg_rating numeric DEFAULT 0,
  total_sessions integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  application_bio text,
  application_qualifications jsonb DEFAULT '[]'::jsonb,
  years_of_experience integer,
  expertise_areas ARRAY,
  rejection_reason text,
  is_flagged boolean DEFAULT false,
  flag_reason text,
  flag_description text,
  flagged_by uuid,
  flagged_at timestamp with time zone,
  is_removed boolean DEFAULT false,
  removed_reason text,
  removed_by uuid,
  removed_at timestamp with time zone,
  CONSTRAINT mentor_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT mentor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT mentor_profiles_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id),
  CONSTRAINT mentor_profiles_flagged_by_fkey FOREIGN KEY (flagged_by) REFERENCES public.profiles(id),
  CONSTRAINT mentor_profiles_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.mentor_session_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  session_type text NOT NULL CHECK (session_type = ANY (ARRAY['mock_interview'::text, 'cv_review'::text, 'career_guidance'::text, 'project_mentorship'::text, 'accountability_checkin'::text])),
  duration_minutes integer DEFAULT 45,
  is_active boolean DEFAULT true,
  CONSTRAINT mentor_session_types_pkey PRIMARY KEY (id),
  CONSTRAINT mentor_session_types_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(id)
);
CREATE TABLE public.platform_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value integer DEFAULT 0,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT platform_analytics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pre_session_briefs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  goals text,
  background text,
  specific_questions text,
  desired_outcome text,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pre_session_briefs_pkey PRIMARY KEY (id),
  CONSTRAINT pre_session_briefs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  university_email text UNIQUE,
  role text DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'mentor'::text, 'admin'::text])),
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  account_status text DEFAULT 'active'::text CHECK (account_status = ANY (ARRAY['active'::text, 'suspended'::text, 'banned'::text])),
  suspension_reason text,
  suspended_by uuid,
  suspended_at timestamp with time zone,
  admin_notes jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.session_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  reviewer_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT session_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT session_reviews_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT session_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  mentor_id uuid,
  session_type text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])),
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 45,
  meeting_link text,
  contact_revealed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT sessions_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(id)
);
CREATE TABLE public.sifarish_vouches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  mentor_id uuid,
  student_id uuid NOT NULL,
  vouch_text text NOT NULL,
  skills_endorsed ARRAY,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  vouch_status text DEFAULT 'active'::text CHECK (vouch_status = ANY (ARRAY['active'::text, 'verified'::text, 'flagged'::text, 'revoked'::text])),
  verified_by uuid,
  verified_at timestamp with time zone,
  is_fraud_flagged boolean DEFAULT false,
  fraud_flagged_by uuid,
  fraud_flagged_at timestamp with time zone,
  CONSTRAINT sifarish_vouches_pkey PRIMARY KEY (id),
  CONSTRAINT sifarish_vouches_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT sifarish_vouches_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentor_profiles(id),
  CONSTRAINT sifarish_vouches_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT sifarish_vouches_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id),
  CONSTRAINT sifarish_vouches_fraud_flagged_by_fkey FOREIGN KEY (fraud_flagged_by) REFERENCES public.profiles(id)
);