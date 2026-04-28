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
  const description = String(body?.description || '').trim()
  const mentorId = await getRouteParam(context, 'id')

  if (!mentorId) {
    return jsonError('Mentor id is required.')
  }

  const { data: mentor, error: mentorError } = await supabase
    .from('mentor_profiles')
    .select('id, user_id, is_flagged, is_removed')
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

  if (action === 'flag') {
    if (!reason) {
      return jsonError('Flag reason is required.')
    }

    const { error } = await supabase
      .from('mentor_profiles')
      .update({
        is_flagged: true,
        flag_reason: reason,
        flag_description: description || null,
        flagged_by: auth.session.user.id,
        flagged_at: new Date().toISOString(),
      })
      .eq('id', mentorId)

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'flag_mentor',
      targetUserId: mentor.user_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'flagged' })
  }

  if (action === 'remove') {
    if (!reason) {
      return jsonError('Removal reason is required.')
    }

    const { error } = await supabase
      .from('mentor_profiles')
      .update({
        is_removed: true,
        removed_reason: reason,
        removed_by: auth.session.user.id,
        removed_at: new Date().toISOString(),
      })
      .eq('id', mentorId)

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'remove_mentor',
      targetUserId: mentor.user_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'removed' })
  }

  if (action === 'restore') {
    const { error } = await supabase
      .from('mentor_profiles')
      .update({
        is_flagged: false,
        flag_reason: null,
        flag_description: null,
        flagged_by: null,
        flagged_at: null,
        is_removed: false,
        removed_reason: null,
        removed_by: null,
        removed_at: null,
      })
      .eq('id', mentorId)

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'restore_mentor',
      targetUserId: mentor.user_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'restored' })
  }

  return jsonError('Unsupported action.')
}
