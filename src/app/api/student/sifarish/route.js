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
    .from('sifarish_vouches')
    .select('id, session_id, mentor_id, vouch_text, skills_endorsed, is_public, vouch_status, created_at')
    .eq('student_id', profile.id)
    .in('vouch_status', ['active', 'verified'])
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data || []
  const mentorIds = [...new Set(rows.map((v) => v.mentor_id).filter(Boolean))]

  let mentorMap = new Map()
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
      mentorRows.forEach((m) => mentorMap.set(m.id, profileMap.get(m.user_id) || null))
    }
  }

  return NextResponse.json({
    vouches: rows.map((v) => ({
      ...v,
      mentor_name: mentorMap.get(v.mentor_id) || 'Unknown Mentor',
    })),
  })
}
