import { NextResponse } from 'next/server'
import { getProfileFromToken } from '@/lib/user-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

function getToken(request) {
  const auth = request.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : ''
}

// GET — check if user already has an application and return its status
export async function GET(request) {
  const profile = await getProfileFromToken(getToken(request))
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = getSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('id, status, rejection_reason, created_at')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ application: data || null })
}

// POST — submit a new mentor application (or resubmit after rejection)
export async function POST(request) {
  const profile = await getProfileFromToken(getToken(request))
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  if (profile.role !== 'student') {
    return NextResponse.json({ error: 'Only students can apply to become a mentor.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const {
    application_bio,
    department,
    year_of_study,
    years_of_experience,
    expertise_areas,
    linkedin_url,
    application_qualifications,
  } = body

  if (!application_bio?.trim()) {
    return NextResponse.json({ error: 'Application bio is required.' }, { status: 400 })
  }
  if (!department?.trim()) {
    return NextResponse.json({ error: 'Department is required.' }, { status: 400 })
  }
  if (!expertise_areas?.length) {
    return NextResponse.json({ error: 'At least one expertise area is required.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()

  // Check for existing application
  const { data: existing } = await supabase
    .from('mentor_profiles')
    .select('id, status')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (existing?.status === 'pending') {
    return NextResponse.json({ error: 'You already have a pending application.' }, { status: 409 })
  }

  if (existing?.status === 'approved') {
    return NextResponse.json({ error: 'Your application has already been approved.' }, { status: 409 })
  }

  const payload = {
    application_bio: application_bio.trim(),
    bio: application_bio.trim(),
    department: department.trim(),
    year_of_study: year_of_study?.trim() || null,
    years_of_experience: Number(years_of_experience) || 0,
    expertise_areas,
    linkedin_url: linkedin_url?.trim() || null,
    application_qualifications: Array.isArray(application_qualifications)
      ? application_qualifications.filter(Boolean)
      : [],
    status: 'pending',
    rejection_reason: null,
  }

  let dbError

  if (existing?.status === 'rejected') {
    // Resubmission — update the existing rejected record
    const { error } = await supabase
      .from('mentor_profiles')
      .update({ ...payload, approved_by: null, approved_at: null })
      .eq('id', existing.id)
    dbError = error
  } else {
    // First application
    const { error } = await supabase
      .from('mentor_profiles')
      .insert({ user_id: profile.id, ...payload })
    dbError = error
  }

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
