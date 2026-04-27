import { NextResponse } from 'next/server'

import {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookie,
  setAdminSessionCookie,
  validateAdminSession,
} from '@/lib/admin-session'

export async function GET(request) {
  try {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    const session = await validateAdminSession(token, { touch: true })

    if (!session.valid) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 })
      clearAdminSessionCookie(response)
      return response
    }

    const response = NextResponse.json({ authenticated: true, user: session.user })
    setAdminSessionCookie(response, token)
    return response
  } catch (error) {
    console.error('Admin session check failed:', error)

    return NextResponse.json(
      {
        error:
          'Admin session could not be verified. Confirm SUPABASE_SERVICE_ROLE_KEY and admin auth tables.',
      },
      { status: 500 }
    )
  }
}
