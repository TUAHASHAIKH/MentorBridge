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

  const { data: mentorRows, error } = await supabase
    .from('mentor_profiles')
    .select(`
      id, user_id, bio, department, year_of_study,
      avg_rating, total_sessions, expertise_areas,
      mentor_session_types (
        id, session_type, duration_minutes, is_active,
        mentor_approved_session_types ( is_approved )
      )
    `)
    .eq('status', 'approved')
    .order('total_sessions', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = mentorRows || []
  const userIds = [...new Set(rows.map((m) => m.user_id).filter(Boolean))]

  const { data: profileRows } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] }

  const profileMap = new Map((profileRows || []).map((p) => [p.id, p]))

  const mentors = rows
    .map((m) => ({
      id: m.id,
      full_name: profileMap.get(m.user_id)?.full_name || null,
      bio: m.bio,
      department: m.department,
      year_of_study: m.year_of_study,
      avg_rating: m.avg_rating,
      total_sessions: m.total_sessions,
      expertise_areas: m.expertise_areas || [],
      session_types: (m.mentor_session_types || []).filter(
        (st) => st.is_active !== false && st.mentor_approved_session_types?.[0]?.is_approved === true
      ),
    }))
    .filter((m) => m.session_types.length > 0)

  return NextResponse.json({ mentors })
}
