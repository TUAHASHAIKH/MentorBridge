import { NextResponse } from 'next/server'

import { getAdminServiceClient, getProfileEmail, getRouteParam, insertAdminAuditLog, jsonError, requireAdminSession } from '@/lib/admin-action-utils'

function normalizeAction(value) {
  return String(value || '').trim().toLowerCase()
}

export async function PATCH(request, context) {
  const auth = await requireAdminSession(request)
  if (auth.response) {
    return auth.response
  }

  const supabase = getAdminServiceClient()
  const body = await request.json().catch(() => null)
  const action = normalizeAction(body?.action)
  const reason = String(body?.reason || '').trim()
  const routeMentorId = await getRouteParam(context, 'id')
  const mentorId = body?.mentorId || routeMentorId
  const sessionTypeId = body?.sessionTypeId

  if (!mentorId || !sessionTypeId) {
    return jsonError('Mentor id and session type id are required.')
  }

  const { data: mentor, error: mentorError } = await supabase
    .from('mentor_profiles')
    .select('id, user_id')
    .eq('id', mentorId)
    .maybeSingle()

  if (mentorError) {
    return jsonError(mentorError.message, 500)
  }

  if (!mentor) {
    return jsonError('Mentor not found.', 404)
  }

  const targetProfile = await getProfileEmail(supabase, mentor.user_id)
  if (!targetProfile) {
    return jsonError('Mentor profile not found.', 404)
  }

  if (action === 'approve') {
    const { error } = await supabase.from('mentor_approved_session_types').upsert(
      {
        mentor_id: mentorId,
        session_type_id: sessionTypeId,
        is_approved: true,
        restricted_reason: null,
        approved_by: auth.session.user.id,
        approved_at: new Date().toISOString(),
      },
      { onConflict: 'mentor_id,session_type_id' }
    )

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'approve_session_type_for_mentor',
      targetUserId: mentor.user_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'approved' })
  }

  if (action === 'restrict') {
    if (!reason) {
      return jsonError('Restriction reason is required.')
    }

    const { error } = await supabase.from('mentor_approved_session_types').upsert(
      {
        mentor_id: mentorId,
        session_type_id: sessionTypeId,
        is_approved: false,
        restricted_reason: reason,
        approved_by: null,
        approved_at: null,
      },
      { onConflict: 'mentor_id,session_type_id' }
    )

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'restrict_session_type_for_mentor',
      targetUserId: mentor.user_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'restricted' })
  }

  return jsonError('Unsupported action.')
}
