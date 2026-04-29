import { NextResponse } from 'next/server'
import { getBearerToken, getMentorFromToken } from '@/lib/mentor-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

// GET — return mentor's profile + session types with admin approval status
export async function GET(request) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = getSupabaseServiceRoleClient()

  const { data: sessionTypes, error } = await supabase
    .from('mentor_session_types')
    .select(`
      id,
      session_type,
      duration_minutes,
      is_active,
      mentor_approved_session_types ( is_approved, restricted_reason )
    `)
    .eq('mentor_id', mentor.mentorProfile.id)
    .order('session_type')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    profile: mentor.profile,
    mentorProfile: mentor.mentorProfile,
    sessionTypes: sessionTypes || [],
  })
}

// PATCH — update editable profile fields
export async function PATCH(request) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { bio, department, year_of_study, linkedin_url } = body

  const supabase = getSupabaseServiceRoleClient()
  const { error } = await supabase
    .from('mentor_profiles')
    .update({
      bio: bio?.trim() ?? null,
      department: department?.trim() ?? null,
      year_of_study: year_of_study?.trim() ?? null,
      linkedin_url: linkedin_url?.trim() ?? null,
    })
    .eq('id', mentor.mentorProfile.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
