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
  const userId = await getRouteParam(context, 'id')

  if (!userId) {
    return jsonError('User id is required.')
  }

  const targetProfile = await getProfileEmail(supabase, userId)
  if (!targetProfile) {
    return jsonError('User not found.', 404)
  }

  if (action === 'suspend') {
    if (!reason) {
      return jsonError('Suspension reason is required.')
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        account_status: 'suspended',
        suspension_reason: reason,
        suspended_by: auth.session.user.id,
        suspended_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'suspend_user',
      targetUserId: userId,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'suspended' })
  }

  if (action === 'unsuspend') {
    const { error } = await supabase
      .from('profiles')
      .update({
        account_status: 'active',
        suspension_reason: null,
        suspended_by: null,
        suspended_at: null,
      })
      .eq('id', userId)

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'unsuspend_user',
      targetUserId: userId,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'active' })
  }

  return jsonError('Unsupported action.')
}
