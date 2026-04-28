import { NextResponse } from 'next/server'

import { ADMIN_SESSION_COOKIE, validateAdminSession } from './admin-session'
import { getSupabaseServiceRoleClient } from './supabase-server'

export function getAdminServiceClient() {
  return getSupabaseServiceRoleClient()
}

export async function requireAdminSession(request) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const session = await validateAdminSession(token, { touch: true })

  if (!session.valid) {
    return { response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  return { session }
}

export function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function insertAdminAuditLog(supabase, { actorAdminId, action, targetUserId, targetEmail }) {
  const { error } = await supabase.from('admin_audit_logs').insert({
    actor_admin_id: actorAdminId,
    action,
    target_user_id: targetUserId,
    target_email: targetEmail,
  })

  if (error) {
    throw error
  }
}

export async function getProfileEmail(supabase, profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}
