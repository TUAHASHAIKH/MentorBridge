import { NextResponse } from 'next/server'

import { createOrPromoteAdminUser } from '@/lib/admin-management'
import { ADMIN_SESSION_COOKIE, validateAdminSession } from '@/lib/admin-session'

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(request) {
  try {
    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    const session = await validateAdminSession(sessionToken, { touch: true })

    if (!session.valid) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()

    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const fullName = String(body?.fullName || '').trim()
    const resetPassword = Boolean(body?.resetPassword)

    if (!email || !password) {
      return badRequest('Email and password are required.')
    }

    const result = await createOrPromoteAdminUser({
      actorAdminId: session.user.id,
      email,
      password,
      fullName,
      resetPassword,
    })

    return NextResponse.json({
      ok: true,
      mode: result.mode,
      email: result.email,
      userId: result.userId,
    })
  } catch (error) {
    const message = String(error?.message || error)

    if (message.includes('Password must be at least 8 characters')) {
      return badRequest(message)
    }

    console.error('Create admin failed:', error)
    return NextResponse.json({ error: 'Failed to create admin user.' }, { status: 500 })
  }
}
