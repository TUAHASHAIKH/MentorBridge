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

  let sifarishSet = new Set()
  if (sessionIds.length > 0) {
    const { data: vouches } = await supabase
      .from('sifarish_vouches')
      .select('session_id')
      .in('session_id', sessionIds)
    sifarishSet = new Set((vouches || []).map((v) => v.session_id))
  }

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

  let actionItemsMap = new Map()
  if (sessionIds.length > 0) {
    const { data: items } = await supabase
      .from('action_items')
      .select('id, session_id, title, description, due_date, status, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true })

    for (const item of items || []) {
      const existing = actionItemsMap.get(item.session_id) || []
      actionItemsMap.set(item.session_id, [...existing, item])
    }
  }

  return NextResponse.json({
    sessions: rows.map((s) => ({
      ...s,
      student_name: studentMap.get(s.student_id)?.full_name || 'Unknown Student',
      student_email: studentMap.get(s.student_id)?.email || null,
      review: reviewMap.get(s.id) || null,
      has_sifarish: sifarishSet.has(s.id),
      action_items: actionItemsMap.get(s.id) || [],
    })),
  })
}
