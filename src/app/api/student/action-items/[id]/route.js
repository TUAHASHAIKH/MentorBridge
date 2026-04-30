import { NextResponse } from 'next/server'
import { getBearerToken } from '@/lib/mentor-auth'
import { getProfileFromToken } from '@/lib/user-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

export async function PATCH(request, context) {
  const profile = await getProfileFromToken(getBearerToken(request))
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await context.params

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { status } = body
  if (!['in_progress', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Status must be "in_progress" or "completed".' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()

  const { data: item } = await supabase
    .from('action_items')
    .select('id, status')
    .eq('id', id)
    .eq('assigned_to', profile.id)
    .maybeSingle()

  if (!item) {
    return NextResponse.json({ error: 'Action item not found.' }, { status: 404 })
  }
  if (item.status === 'completed') {
    return NextResponse.json({ error: 'Completed items cannot be changed.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('action_items')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, status })
}
