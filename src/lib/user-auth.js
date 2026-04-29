import { getSupabaseServiceRoleClient } from './supabase-server'

export async function getProfileFromToken(accessToken) {
  if (!accessToken) return null

  const supabase = getSupabaseServiceRoleClient()

  const { data: { user }, error } = await supabase.auth.getUser(accessToken)
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, account_status, university_email, avatar_url, created_at')
    .eq('id', user.id)
    .single()

  return profile || null
}
