import { NextResponse } from 'next/server'
import { getBearerToken, getMentorFromToken } from '@/lib/mentor-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = getSupabaseServiceRoleClient()

  const { data, error } = await supabase
    .from('sifarish_vouches')
    .select('id, session_id, student_id, vouch_text, skills_endorsed, is_public, vouch_status, created_at')
    .eq('mentor_id', mentor.mentorProfile.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data || []
  const studentIds = [...new Set(rows.map((v) => v.student_id).filter(Boolean))]

  let studentMap = new Map()
  if (studentIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)
    studentMap = new Map((profileRows || []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]))
  }

  return NextResponse.json({
    vouches: rows.map((v) => ({
      ...v,
      student_name: studentMap.get(v.student_id)?.full_name || 'Unknown Student',
      student_email: studentMap.get(v.student_id)?.email || null,
    })),
  })
}

export async function POST(request) {
  const mentor = await getMentorFromToken(getBearerToken(request))
  if (!mentor) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { session_id, vouch_text, skills_endorsed, is_public } = body

  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required.' }, { status: 400 })
  }
  if (!vouch_text?.trim()) {
    return NextResponse.json({ error: 'Vouch text is required.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()

  // Verify session is completed and belongs to this mentor
  const { data: session } = await supabase
    .from('sessions')
    .select('id, status, student_id, mentor_id')
    .eq('id', session_id)
    .eq('mentor_id', mentor.mentorProfile.id)
    .maybeSingle()

  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }
  if (session.status !== 'completed') {
    return NextResponse.json({ error: 'Sifarish can only be written for completed sessions.' }, { status: 400 })
  }

  // One vouch per session
  const { data: existing } = await supabase
    .from('sifarish_vouches')
    .select('id')
    .eq('session_id', session_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A Sifarish has already been written for this session.' }, { status: 409 })
  }

  // Normalize skills: accept array or comma-separated string
  let skillsArray = []
  if (Array.isArray(skills_endorsed)) {
    skillsArray = skills_endorsed.map((s) => s.trim()).filter(Boolean)
  } else if (typeof skills_endorsed === 'string' && skills_endorsed.trim()) {
    skillsArray = skills_endorsed.split(',').map((s) => s.trim()).filter(Boolean)
  }

  const { data: vouch, error: insertError } = await supabase
    .from('sifarish_vouches')
    .insert({
      session_id,
      mentor_id: mentor.mentorProfile.id,
      student_id: session.student_id,
      vouch_text: vouch_text.trim(),
      skills_endorsed: skillsArray,
      is_public: is_public !== false,
    })
    .select('id, vouch_text, skills_endorsed, is_public, vouch_status, created_at')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, vouch })
}
