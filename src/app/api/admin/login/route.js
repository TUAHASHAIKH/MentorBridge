import { NextResponse } from 'next/server'

import {
  createAdminSession,
  getAdminLoginAttempt,
  registerFailedAdminLogin,
  resetFailedAdminLogins,
  setAdminSessionCookie,
} from '@/lib/admin-session'
import { getSupabaseAnonServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase-server'

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const email = body?.email?.trim()?.toLowerCase() || ''
    const password = body?.password || ''

    if (!email || !password) {
      return badRequest('Email and password are required.')
    }

    const currentAttempt = await getAdminLoginAttempt(email)

    if (currentAttempt?.isLocked) {
      return NextResponse.json(
        {
          error:
            'Too many failed login attempts. This account is temporarily locked. Please try again later.',
        },
        { status: 423 }
      )
    }

    const supabaseAnon = getSupabaseAnonServerClient()
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !signInData?.user) {
      const failedAttempt = await registerFailedAdminLogin(email)

      if (failedAttempt.isLocked) {
        return NextResponse.json(
          {
            error:
              'Too many failed login attempts. This account is temporarily locked. Please try again later.',
          },
          { status: 423 }
        )
      }

      return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 })
    }

    const supabaseService = getSupabaseServiceRoleClient()
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', signInData.user.id)
      .maybeSingle()

    if (profileError || !profile || profile.role !== 'admin') {
      await registerFailedAdminLogin(email)

      return NextResponse.json(
        { error: 'Access denied. Admin portal is only available to admin accounts.' },
        { status: 403 }
      )
    }

    await resetFailedAdminLogins(email)

    const sessionToken = await createAdminSession(profile.id)
    const response = NextResponse.json({
      ok: true,
      user: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role: profile.role,
      },
    })

    setAdminSessionCookie(response, sessionToken)
    return response
  } catch (error) {
    console.error('Admin login failed:', error)

    return NextResponse.json(
      {
        error:
          'Admin auth setup is incomplete. Ensure tables admin_login_attempts and admin_sessions exist and SUPABASE_SERVICE_ROLE_KEY is set.',
      },
      { status: 500 }
    )
  }
}
