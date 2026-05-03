import { NextResponse } from 'next/server'
import { getBearerToken } from '@/lib/mentor-auth'
import { getProfileFromToken } from '@/lib/user-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

async function getParam(context, key) {
  const params = await context?.params
  return params?.[key]
}

function sanitizeSessionTypes(sessionTypes = []) {
  return sessionTypes
    .filter((st) => st.is_active !== false)
    .filter((st) => st.mentor_approved_session_types?.[0]?.is_approved === true)
    .map((st) => ({
      id: st.id,
      session_type: st.session_type,
      duration_minutes: st.duration_minutes,
    }))
}

export async function GET(request, context) {
  const profile = await getProfileFromToken(getBearerToken(request))
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  if (profile.role !== 'student') {
    return NextResponse.json({ error: 'Only students can view mentor profiles.' }, { status: 403 })
  }

  const mentorId = await getParam(context, 'id')
  if (!mentorId) {
    return NextResponse.json({ error: 'Mentor id is required.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()

  const { data: mentorRow, error: mentorError } = await supabase
    .from('mentor_profiles')
    .select(`
      id, user_id, bio, department, year_of_study,
      avg_rating, total_sessions, expertise_areas, approved_at,
      mentor_session_types (
        id, session_type, duration_minutes, is_active,
        mentor_approved_session_types ( is_approved )
      )
    `)
    .eq('id', mentorId)
    .eq('status', 'approved')
    .maybeSingle()

  if (mentorError) {
    return NextResponse.json({ error: mentorError.message }, { status: 500 })
  }
  if (!mentorRow) {
    return NextResponse.json({ error: 'Mentor not found or not approved.' }, { status: 404 })
  }

  const sessionTypes = sanitizeSessionTypes(mentorRow.mentor_session_types)
  if (sessionTypes.length === 0) {
    return NextResponse.json({ error: 'Mentor is not currently bookable.' }, { status: 404 })
  }

  const { data: publicProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', mentorRow.user_id)
    .maybeSingle()

  const { count: completedCount } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('mentor_id', mentorId)
    .eq('status', 'completed')

  const { data: completedSessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('mentor_id', mentorId)
    .eq('status', 'completed')

  const completedSessionIds = (completedSessions || []).map((session) => session.id)

  let reviews = []
  let reviewCount = 0
  if (completedSessionIds.length > 0) {
    const { data: reviewRows, count } = await supabase
      .from('session_reviews')
      .select('id, session_id, rating, feedback, created_at', { count: 'exact' })
      .in('session_id', completedSessionIds)
      .order('created_at', { ascending: false })

    reviewCount = count || 0
    reviews = (reviewRows || [])
      .filter((review) => review.feedback?.trim())
      .slice(0, 5)
      .map((review) => ({
        id: review.id,
        rating: review.rating,
        feedback: review.feedback,
        created_at: review.created_at,
      }))
  }

  const { count: sifarishCount } = await supabase
    .from('sifarish_vouches')
    .select('id', { count: 'exact', head: true })
    .eq('mentor_id', mentorId)
    .eq('is_public', true)
    .in('vouch_status', ['active', 'verified'])

  const { data: sifarishRows } = await supabase
    .from('sifarish_vouches')
    .select('id, vouch_text, skills_endorsed, vouch_status, created_at')
    .eq('mentor_id', mentorId)
    .eq('is_public', true)
    .in('vouch_status', ['active', 'verified'])
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    mentor: {
      id: mentorRow.id,
      full_name: publicProfile?.full_name || null,
      bio: mentorRow.bio,
      department: mentorRow.department,
      year_of_study: mentorRow.year_of_study,
      avg_rating: mentorRow.avg_rating,
      total_sessions: mentorRow.total_sessions || completedCount || 0,
      completed_sessions: completedCount || 0,
      review_count: reviewCount,
      expertise_areas: mentorRow.expertise_areas || [],
      approved_at: mentorRow.approved_at,
      session_types: sessionTypes,
      availability: {
        mode: 'request',
        summary: 'Students can request a preferred future time. The mentor confirms the final slot.',
      },
    },
    reviews,
    sifarish: {
      count: sifarishCount || 0,
      vouches: (sifarishRows || []).map((vouch) => ({
        id: vouch.id,
        vouch_text: vouch.vouch_text,
        skills_endorsed: vouch.skills_endorsed || [],
        vouch_status: vouch.vouch_status,
        created_at: vouch.created_at,
      })),
    },
  })
}
