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

  const { data: sessions } = await supabase
    .from('sessions')
    .select('status')
    .eq('student_id', profile.id)

  const rows = sessions || []
  const completed = rows.filter((s) => s.status === 'completed').length
  const active = rows.filter((s) => ['pending', 'confirmed'].includes(s.status)).length

  const { count: vouchCount } = await supabase
    .from('sifarish_vouches')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', profile.id)
    .in('vouch_status', ['active', 'verified'])

  const { count: actionItemsCount } = await supabase
    .from('action_items')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', profile.id)
    .neq('status', 'completed')

  return NextResponse.json({
    stats: {
      total_sessions: rows.length,
      completed_sessions: completed,
      active_sessions: active,
      sifarish_count: vouchCount || 0,
      pending_action_items: actionItemsCount || 0,
    },
  })
}
