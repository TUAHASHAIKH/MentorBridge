import { NextResponse } from 'next/server'
import { getBearerToken, getMentorFromToken } from '@/lib/mentor-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { session_id, title, description, due_date } = body

  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required.' }, { status: 400 })
  }
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, status, student_id')
    .eq('id', session_id)
    .eq('mentor_id', mentor.mentorProfile.id)
    .maybeSingle()

  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }
  if (session.status !== 'completed') {
    return NextResponse.json({ error: 'Action items can only be added to completed sessions.' }, { status: 400 })
  }

  const { data: item, error } = await supabase
    .from('action_items')
    .insert({
      session_id,
      assigned_to: session.student_id,
      title: title.trim(),
      description: description?.trim() || null,
      due_date: due_date || null,
    })
    .select('id, title, description, due_date, status, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, item })
}
