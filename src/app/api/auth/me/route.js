import { NextResponse } from 'next/server'
import { getProfileFromToken } from '@/lib/user-auth'

export async function GET(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const profile = await getProfileFromToken(token)

  if (!profile) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  return NextResponse.json(profile)
}
