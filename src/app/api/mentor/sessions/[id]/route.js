import { NextResponse } from 'next/server'
import { getBearerToken, getMentorFromToken } from '@/lib/mentor-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

export async function PATCH(request, context) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Session id is required.' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('id', id)
    .eq('mentor_id', mentor.mentorProfile.id)
    .maybeSingle()

  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }

  const { action } = body

  if (action === 'accept') {
    if (session.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending sessions can be accepted.' }, { status: 400 })
    }
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'confirmed' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, status: 'confirmed' })
  }

  if (action === 'add_link') {
    const link = body.meeting_link?.trim()
    if (!link) {
      return NextResponse.json({ error: 'Meeting link is required.' }, { status: 400 })
    }
    if (session.status !== 'confirmed') {
      return NextResponse.json({ error: 'Session must be confirmed before adding a meeting link.' }, { status: 400 })
    }
    const { error } = await supabase
      .from('sessions')
      .update({ meeting_link: link, contact_revealed: true })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'complete') {
    if (session.status !== 'confirmed') {
      return NextResponse.json({ error: 'Only confirmed sessions can be marked complete.' }, { status: 400 })
    }
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: mp } = await supabase
      .from('mentor_profiles')
      .select('total_sessions')
      .eq('id', mentor.mentorProfile.id)
      .single()
    await supabase
      .from('mentor_profiles')
      .update({ total_sessions: (mp?.total_sessions || 0) + 1 })
      .eq('id', mentor.mentorProfile.id)

    return NextResponse.json({ success: true, status: 'completed' })
  }

  if (action === 'cancel') {
    if (!['pending', 'confirmed'].includes(session.status)) {
      return NextResponse.json({ error: 'Session cannot be cancelled.' }, { status: 400 })
    }
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, status: 'cancelled' })
  }

  return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 })
}
