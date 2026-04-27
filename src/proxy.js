import { NextResponse } from 'next/server'

import {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookie,
  setAdminSessionCookie,
  validateAdminSession,
} from '@/lib/admin-session'

export async function proxy(request) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value

  if (pathname === '/admin/login') {
    if (!token) {
      return NextResponse.next()
    }

    const session = await validateAdminSession(token, { touch: true })
    if (!session.valid) {
      const response = NextResponse.next()
      clearAdminSessionCookie(response)
      return response
    }

    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  const session = await validateAdminSession(token, { touch: true })

  if (!session.valid) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    const response = NextResponse.redirect(url)
    clearAdminSessionCookie(response)
    return response
  }

  const response = NextResponse.next()
  setAdminSessionCookie(response, token)
  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
