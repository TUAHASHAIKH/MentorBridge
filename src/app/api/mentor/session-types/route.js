import { NextResponse } from 'next/server'
import { getBearerToken, getMentorFromToken } from '@/lib/mentor-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

const VALID_SESSION_TYPES = [
  'mock_interview',
  'cv_review',
  'career_guidance',
  'project_mentorship',
  'accountability_checkin',
]

// POST — add a new session type for this mentor
export async function POST(request) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { session_type, duration_minutes = 45 } = body

  if (!VALID_SESSION_TYPES.includes(session_type)) {
    return NextResponse.json({ error: 'Invalid session type.' }, { status: 400 })
  }

  const duration = Number(duration_minutes)
  if (!duration || duration < 15 || duration > 180) {
    return NextResponse.json({ error: 'Duration must be between 15 and 180 minutes.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()

  // Prevent duplicates
  const { data: existing } = await supabase
    .from('mentor_session_types')
    .select('id')
    .eq('mentor_id', mentor.mentorProfile.id)
    .eq('session_type', session_type)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You have already added this session type.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('mentor_session_types')
    .insert({
      mentor_id: mentor.mentorProfile.id,
      session_type,
      duration_minutes: duration,
      is_active: true,
    })
    .select('id, session_type, duration_minutes, is_active')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, sessionType: data })
}
