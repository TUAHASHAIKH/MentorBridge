import { NextResponse } from 'next/server'
import { getBearerToken, getMentorFromToken } from '@/lib/mentor-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = getSupabaseServiceRoleClient()

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id, session_type, status, scheduled_at, duration_minutes,
      meeting_link, contact_revealed, created_at, student_id,
      pre_session_briefs ( goals, background, specific_questions, desired_outcome )
    `)
    .eq('mentor_id', mentor.mentorProfile.id)
    .order('scheduled_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data || []
  const sessionIds = rows.map((s) => s.id)
  const studentIds = [...new Set(rows.map((s) => s.student_id).filter(Boolean))]

  let studentMap = new Map()
  if (studentIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)

    studentMap = new Map((profileRows || []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]))
  }

  let reviewMap = new Map()
  if (sessionIds.length > 0) {
    const { data: reviews } = await supabase
      .from('session_reviews')
      .select('session_id, rating, feedback')
      .in('session_id', sessionIds)

    reviewMap = new Map((reviews || []).map((r) => [r.session_id, { rating: r.rating, feedback: r.feedback }]))
  }

  return NextResponse.json({
    sessions: rows.map((s) => ({
      ...s,
      student_name: studentMap.get(s.student_id)?.full_name || 'Unknown Student',
      student_email: studentMap.get(s.student_id)?.email || null,
      review: reviewMap.get(s.id) || null,
    })),
  })
}
