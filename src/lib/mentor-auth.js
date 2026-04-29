import { getProfileFromToken } from './user-auth'
import { getSupabaseServiceRoleClient } from './supabase-server'

/**
 * Validates the Bearer token and returns both the user profile and their
 * mentor_profiles record. Returns null if invalid, not a mentor, or no
 * mentor_profile row exists.
 */
export async function getMentorFromToken(accessToken) {
  const profile = await getProfileFromToken(accessToken)
  if (!profile || profile.role !== 'mentor') return null

  const supabase = getSupabaseServiceRoleClient()
  const { data: mentorProfile } = await supabase
    .from('mentor_profiles')
    .select('id, bio, department, year_of_study, linkedin_url, avg_rating, total_sessions, expertise_areas, status')
    .eq('user_id', profile.id)
    .single()

  if (!mentorProfile) return null

  return { profile, mentorProfile }
}

export function getBearerToken(request) {
  const auth = request.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : ''
}
