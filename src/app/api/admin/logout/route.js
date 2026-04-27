import { NextResponse } from 'next/server'

import {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookie,
  deleteAdminSessionByToken,
} from '@/lib/admin-session'

export async function POST(request) {
  try {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    await deleteAdminSessionByToken(token)

    const response = NextResponse.json({ ok: true })
    clearAdminSessionCookie(response)
    return response
  } catch (error) {
    console.error('Admin logout failed:', error)

    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 })
  }
}
