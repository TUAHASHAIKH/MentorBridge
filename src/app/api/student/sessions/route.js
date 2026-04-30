import { NextResponse } from 'next/server'
import { getBearerToken } from '@/lib/mentor-auth'
import { getProfileFromToken } from '@/lib/user-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request) {
  const profile = await getProfileFromToken(getBearerToken(request))
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = getSupabaseServiceRoleClient()

  const { data, error } = await supabase
    .from('sessions')
    .select('id, session_type, status, scheduled_at, duration_minutes, meeting_link, contact_revealed, created_at, mentor_id')
    .eq('student_id', profile.id)
    .order('scheduled_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data || []
  const mentorIds = [...new Set(rows.map((s) => s.mentor_id).filter(Boolean))]

  let mentorNameMap = new Map()
  if (mentorIds.length > 0) {
    const { data: mentorRows } = await supabase
      .from('mentor_profiles')
      .select('id, user_id')
      .in('id', mentorIds)

    if (mentorRows?.length) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', mentorRows.map((m) => m.user_id))

      const profileMap = new Map((profileRows || []).map((p) => [p.id, p.full_name]))
      mentorRows.forEach((m) => mentorNameMap.set(m.id, profileMap.get(m.user_id) || null))
    }
  }

  const sessionIds = rows.map((s) => s.id)
  let reviewSet = new Set()
  if (sessionIds.length > 0) {
    const { data: reviews } = await supabase
      .from('session_reviews')
      .select('session_id')
      .in('session_id', sessionIds)
    reviewSet = new Set((reviews || []).map((r) => r.session_id))
  }

  return NextResponse.json({
    sessions: rows.map((s) => ({
      ...s,
      mentor_name: mentorNameMap.get(s.mentor_id) || 'Unknown Mentor',
      has_review: reviewSet.has(s.id),
    })),
  })
}
