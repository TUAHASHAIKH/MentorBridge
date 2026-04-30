import { NextResponse } from 'next/server'
import { getBearerToken } from '@/lib/mentor-auth'
import { getProfileFromToken } from '@/lib/user-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request) {
  const profile = await getProfileFromToken(getBearerToken(request))
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  if (profile.role !== 'student') {
    return NextResponse.json({ error: 'Only students can book sessions.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const {
    mentor_id,
    session_type,
    duration_minutes,
    scheduled_at,
    goals,
    background,
    specific_questions,
    desired_outcome,
  } = body

  if (!mentor_id || !session_type || !scheduled_at) {
    return NextResponse.json(
      { error: 'mentor_id, session_type, and scheduled_at are required.' },
      { status: 400 }
    )
  }

  const scheduledDate = new Date(scheduled_at)
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return NextResponse.json(
      { error: 'Scheduled time must be in the future.' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseServiceRoleClient()

  // Verify mentor is approved
  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('id')
    .eq('id', mentor_id)
    .eq('status', 'approved')
    .maybeSingle()

  if (!mentor) {
    return NextResponse.json({ error: 'Mentor not found or not approved.' }, { status: 404 })
  }

  // Verify session type is approved for this mentor
  const { data: sessionTypeRow } = await supabase
    .from('mentor_session_types')
    .select('id, duration_minutes, mentor_approved_session_types ( is_approved )')
    .eq('mentor_id', mentor_id)
    .eq('session_type', session_type)
    .maybeSingle()

  if (!sessionTypeRow || sessionTypeRow.mentor_approved_session_types?.[0]?.is_approved !== true) {
    return NextResponse.json(
      { error: 'This session type is not available for this mentor.' },
      { status: 400 }
    )
  }

  // Prevent double-booking: student cannot have a pending/confirmed session with the same mentor
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('student_id', profile.id)
    .eq('mentor_id', mentor_id)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()

  if (existingSession) {
    return NextResponse.json(
      { error: 'You already have an active session with this mentor. Complete or cancel it before booking again.' },
      { status: 409 }
    )
  }

  // Create the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      student_id: profile.id,
      mentor_id,
      session_type,
      duration_minutes: duration_minutes || sessionTypeRow.duration_minutes || 45,
      scheduled_at: scheduledDate.toISOString(),
      status: 'pending',
      contact_revealed: false,
    })
    .select('id')
    .single()

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  // Create pre-session brief
  const hasAnyBrief = goals || background || specific_questions || desired_outcome
  if (hasAnyBrief) {
    await supabase.from('pre_session_briefs').insert({
      session_id: session.id,
      goals: goals?.trim() || null,
      background: background?.trim() || null,
      specific_questions: specific_questions?.trim() || null,
      desired_outcome: desired_outcome?.trim() || null,
    })
  }

  return NextResponse.json({ success: true, sessionId: session.id })
}
