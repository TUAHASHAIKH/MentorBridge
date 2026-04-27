import crypto from 'crypto'

import { getSupabaseServiceRoleClient } from './supabase-server'

export const ADMIN_SESSION_COOKIE = 'mb_admin_session'
export const MAX_FAILED_LOGIN_ATTEMPTS = 5
export const SESSION_INACTIVITY_HOURS = 8
export const SESSION_MAX_AGE_SECONDS = SESSION_INACTIVITY_HOURS * 60 * 60

function getLockMinutes() {
  const value = Number.parseInt(process.env.ADMIN_LOCK_MINUTES ?? '30', 10)

  if (Number.isNaN(value) || value <= 0) {
    return 30
  }

  return value
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateSessionToken() {
  return crypto.randomBytes(48).toString('hex')
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  }
}

export function setAdminSessionCookie(response, token) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, buildCookieOptions())
}

export function clearAdminSessionCookie(response) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

function isSessionExpired(lastActivityAt) {
  const lastActivityMs = new Date(lastActivityAt).getTime()
  const nowMs = Date.now()
  return nowMs - lastActivityMs > SESSION_MAX_AGE_SECONDS * 1000
}

export async function registerFailedAdminLogin(email) {
  const supabase = getSupabaseServiceRoleClient()
  const normalizedEmail = email.trim().toLowerCase()

  const { data: existing, error: readError } = await supabase
    .from('admin_login_attempts')
    .select('failed_count')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (readError) {
    throw readError
  }

  const failedCount = (existing?.failed_count ?? 0) + 1
  const shouldLock = failedCount >= MAX_FAILED_LOGIN_ATTEMPTS
  const lockUntil = shouldLock
    ? new Date(Date.now() + getLockMinutes() * 60 * 1000).toISOString()
    : null

  const { error: upsertError } = await supabase.from('admin_login_attempts').upsert(
    {
      email: normalizedEmail,
      failed_count: failedCount,
      locked_until: lockUntil,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  )

  if (upsertError) {
    throw upsertError
  }

  return {
    failedCount,
    isLocked: shouldLock,
    lockUntil,
  }
}

export async function resetFailedAdminLogins(email) {
  const supabase = getSupabaseServiceRoleClient()
  const normalizedEmail = email.trim().toLowerCase()

  const { error } = await supabase
    .from('admin_login_attempts')
    .delete()
    .eq('email', normalizedEmail)

  if (error) {
    throw error
  }
}

export async function getAdminLoginAttempt(email) {
  const supabase = getSupabaseServiceRoleClient()
  const normalizedEmail = email.trim().toLowerCase()

  const { data, error } = await supabase
    .from('admin_login_attempts')
    .select('failed_count, locked_until')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const lockedUntilMs = data.locked_until ? new Date(data.locked_until).getTime() : 0
  const isLocked = lockedUntilMs > Date.now()

  return {
    failedCount: data.failed_count,
    isLocked,
    lockUntil: data.locked_until,
  }
}

export async function createAdminSession(userId) {
  const supabase = getSupabaseServiceRoleClient()
  const token = generateSessionToken()

  const { error } = await supabase.from('admin_sessions').insert({
    user_id: userId,
    token_hash: hashSessionToken(token),
    last_activity_at: new Date().toISOString(),
  })

  if (error) {
    throw error
  }

  return token
}

export async function deleteAdminSessionByToken(token) {
  if (!token) {
    return
  }

  const supabase = getSupabaseServiceRoleClient()
  const { error } = await supabase
    .from('admin_sessions')
    .delete()
    .eq('token_hash', hashSessionToken(token))

  if (error) {
    throw error
  }
}

export async function validateAdminSession(token, { touch = false } = {}) {
  if (!token) {
    return { valid: false, reason: 'missing_token' }
  }

  const supabase = getSupabaseServiceRoleClient()
  const tokenHash = hashSessionToken(token)

  const { data: session, error: sessionError } = await supabase
    .from('admin_sessions')
    .select('id, user_id, last_activity_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (sessionError) {
    throw sessionError
  }

  if (!session || session.revoked_at) {
    return { valid: false, reason: 'invalid_session' }
  }

  if (isSessionExpired(session.last_activity_at)) {
    await supabase.from('admin_sessions').delete().eq('id', session.id)
    return { valid: false, reason: 'expired' }
  }

  if (touch) {
    const { error: touchError } = await supabase
      .from('admin_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id)

    if (touchError) {
      throw touchError
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', session.user_id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile || profile.role !== 'admin') {
    return { valid: false, reason: 'not_admin' }
  }

  return {
    valid: true,
    user: {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      role: profile.role,
    },
  }
}
