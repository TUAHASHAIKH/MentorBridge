import { NextResponse } from 'next/server'

import { ADMIN_SESSION_COOKIE, validateAdminSession } from '@/lib/admin-session'
import { getManageAdminsData } from '@/lib/admin-dashboard-data'

export async function GET(request) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const session = await validateAdminSession(token, { touch: true })

  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const data = await getManageAdminsData()
  return NextResponse.json({ ok: true, ...data })
}
