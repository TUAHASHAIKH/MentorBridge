import { NextResponse } from 'next/server'
import { getBearerToken, getMentorFromToken } from '@/lib/mentor-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

async function getOwnedSessionType(supabase, mentorProfileId, sessionTypeId) {
  const { data } = await supabase
    .from('mentor_session_types')
    .select('id, mentor_id')
    .eq('id', sessionTypeId)
    .eq('mentor_id', mentorProfileId)
    .maybeSingle()
  return data
}

// PATCH — update duration or toggle active state
export async function PATCH(request, context) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Session type id is required.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()
  const owned = await getOwnedSessionType(supabase, mentor.mentorProfile.id, id)
  if (!owned) {
    return NextResponse.json({ error: 'Session type not found.' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const updates = {}

  if (body.duration_minutes !== undefined) {
    const duration = Number(body.duration_minutes)
    if (!duration || duration < 15 || duration > 180) {
      return NextResponse.json({ error: 'Duration must be between 15 and 180 minutes.' }, { status: 400 })
    }
    updates.duration_minutes = duration
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('mentor_session_types')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE — remove session type (clears admin approval record first to avoid FK constraint)
export async function DELETE(request, context) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Session type id is required.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()
  const owned = await getOwnedSessionType(supabase, mentor.mentorProfile.id, id)
  if (!owned) {
    return NextResponse.json({ error: 'Session type not found.' }, { status: 404 })
  }

  // Remove admin approval record first (FK constraint: no CASCADE defined)
  await supabase
    .from('mentor_approved_session_types')
    .delete()
    .eq('session_type_id', id)
    .eq('mentor_id', mentor.mentorProfile.id)

  const { error } = await supabase
    .from('mentor_session_types')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
