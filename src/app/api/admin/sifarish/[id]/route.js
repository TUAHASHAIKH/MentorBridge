import { NextResponse } from 'next/server'

import { getAdminServiceClient, getProfileEmail, insertAdminAuditLog, jsonError, requireAdminSession } from '@/lib/admin-action-utils'

function normalizeAction(value) {
  return String(value || '').trim().toLowerCase()
}

export async function PATCH(request, { params }) {
  const auth = await requireAdminSession(request)
  if (auth.response) {
    return auth.response
  }

  const supabase = getAdminServiceClient()
  const body = await request.json().catch(() => null)
  const action = normalizeAction(body?.action)
  const vouchId = params.id

  if (!vouchId) {
    return jsonError('Vouch id is required.')
  }

  const { data: vouch, error: vouchError } = await supabase
    .from('sifarish_vouches')
    .select('id, student_id, mentor_id, vouch_status')
    .eq('id', vouchId)
    .maybeSingle()

  if (vouchError) {
    return jsonError(vouchError.message, 500)
  }

  if (!vouch) {
    return jsonError('Vouch not found.', 404)
  }

  const targetProfile = await getProfileEmail(supabase, vouch.student_id)
  if (!targetProfile) {
    return jsonError('Vouch owner not found.', 404)
  }

  if (action === 'verify') {
    const { error } = await supabase
      .from('sifarish_vouches')
      .update({
        vouch_status: 'verified',
        verified_by: auth.session.user.id,
        verified_at: new Date().toISOString(),
        is_fraud_flagged: false,
        fraud_flagged_by: null,
        fraud_flagged_at: null,
      })
      .eq('id', vouchId)

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'verify_sifarish_vouch',
      targetUserId: vouch.student_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'verified' })
  }

  if (action === 'revoke') {
    const { error } = await supabase
      .from('sifarish_vouches')
      .update({
        vouch_status: 'revoked',
        is_fraud_flagged: true,
        fraud_flagged_by: auth.session.user.id,
        fraud_flagged_at: new Date().toISOString(),
      })
      .eq('id', vouchId)

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'revoke_sifarish_vouch',
      targetUserId: vouch.student_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'revoked' })
  }

  if (action === 'flag') {
    const { error } = await supabase
      .from('sifarish_vouches')
      .update({
        vouch_status: 'flagged',
        is_fraud_flagged: true,
        fraud_flagged_by: auth.session.user.id,
        fraud_flagged_at: new Date().toISOString(),
      })
      .eq('id', vouchId)

    if (error) {
      return jsonError(error.message, 500)
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId: auth.session.user.id,
      action: 'flag_sifarish_vouch',
      targetUserId: vouch.student_id,
      targetEmail: targetProfile.email,
    })

    return NextResponse.json({ ok: true, status: 'flagged' })
  }

  return jsonError('Unsupported action.')
}
