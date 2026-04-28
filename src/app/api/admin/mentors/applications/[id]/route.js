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
  const rejectionReason = String(body?.rejectionReason || '').trim()
  const applicationId = await getRouteParam(context, 'id')

  if (!applicationId) {
    return jsonError('Application id is required.')
  }

  const { data: application, error: applicationError } = await supabase
    .from('mentor_profiles')
    .select('id, user_id, status, rejection_reason')
    .eq('id', applicationId)
    .maybeSingle()

  if (applicationError) {
    return jsonError(applicationError.message, 500)
  }

  if (!application) {
    return jsonError('Application not found.', 404)
  }

  const targetProfile = await getProfileEmail(supabase, application.user_id)

  if (!targetProfile) {
    return jsonError('Applicant profile not found.', 404)
  }

  if (action === 'approve') {
    const { error } = await supabase
      .from('mentor_profiles')
      .update({
        status: 'approved',
        approved_by: auth.session.user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
        is_removed: false,
        removed_reason: null,
        removed_by: null,
        removed_at: null,
      })
      .eq('id', applicationId)

    if (error) {
      return jsonError(error.message, 500)
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'mentor' })
      .eq('id', application.user_id)

    if (profileError) {
      return jsonError(profileError.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'approve_mentor_application',
      targetUserId: application.user_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'approved' })
  }

  if (action === 'reject') {
    if (!rejectionReason) {
      return jsonError('Rejection reason is required.')
    }

    const { error } = await supabase
      .from('mentor_profiles')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        approved_by: null,
        approved_at: null,
      })
      .eq('id', applicationId)

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'reject_mentor_application',
      targetUserId: application.user_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  return jsonError('Unsupported action.')
}
