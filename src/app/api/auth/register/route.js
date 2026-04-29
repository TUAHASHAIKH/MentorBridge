import { NextResponse } from 'next/server'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { access_token, full_name, email } = await request.json()

    if (!access_token || !full_name || !email) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceRoleClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
    }

    // Idempotent — if profile already exists, return success
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ success: true })
    }

    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email,
        full_name: full_name.trim(),
        role: 'student',
        account_status: 'active',
      })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create profile.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
