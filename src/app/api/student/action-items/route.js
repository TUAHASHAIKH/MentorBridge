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
    .from('action_items')
    .select('id, session_id, title, description, due_date, status, created_at')
    .eq('assigned_to', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data || []
  const sessionIds = [...new Set(rows.map((i) => i.session_id).filter(Boolean))]

  let sessionMap = new Map()
  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, session_type, mentor_id')
      .in('id', sessionIds)

    const mentorIds = [...new Set((sessions || []).map((s) => s.mentor_id).filter(Boolean))]
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

    sessionMap = new Map(
      (sessions || []).map((s) => [
        s.id,
        {
          session_type: s.session_type,
          mentor_name: mentorNameMap.get(s.mentor_id) || 'Unknown Mentor',
        },
      ])
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return NextResponse.json({
    items: rows.map((item) => {
      const info = sessionMap.get(item.session_id) || {}
      const isOverdue =
        item.due_date &&
        new Date(item.due_date) < today &&
        item.status !== 'completed'
      return {
        ...item,
        session_type: info.session_type || null,
        mentor_name: info.mentor_name || 'Unknown Mentor',
        is_overdue: isOverdue,
      }
    }),
  })
}
