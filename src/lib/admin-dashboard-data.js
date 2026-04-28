import { getSupabaseServiceRoleClient } from './supabase-server'

function getAdminDataClient() {
  return getSupabaseServiceRoleClient()
}

function normalizeRows(rows) {
  return rows || []
}

async function getProfilesByIds(supabase, ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]

  if (uniqueIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, university_email, created_at')
    .in('id', uniqueIds)

  if (error) {
    throw error
  }

  return normalizeRows(data)
}

export async function getAdminDashboardOverview() {
  const supabase = getAdminDataClient()

  const [
    mentorsResult,
    pendingApplicationsResult,
    activeUsersResult,
    activeSessionsResult,
    flaggedMentorsResult,
    pendingVouchesResult,
    recentAdminLogsResult,
  ] = await Promise.all([
    supabase.from('mentor_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('mentor_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_status', 'active'),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed']),
    supabase
      .from('mentor_profiles')
      .select('id', { count: 'exact', head: true })
      .or('is_flagged.eq.true,is_removed.eq.true'),
    supabase.from('sifarish_vouches').select('id', { count: 'exact', head: true }).eq('vouch_status', 'pending'),
    supabase
      .from('admin_audit_logs')
      .select('id, action, target_email, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    stats: {
      mentors: mentorsResult.count || 0,
      pendingApplications: pendingApplicationsResult.count || 0,
      activeUsers: activeUsersResult.count || 0,
      activeSessions: activeSessionsResult.count || 0,
      flaggedMentors: flaggedMentorsResult.count || 0,
      pendingVouches: pendingVouchesResult.count || 0,
    },
    recentLogs: normalizeRows(recentAdminLogsResult.data),
  }
}

export async function getManageAdminsData() {
  const supabase = getAdminDataClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return {
    admins: normalizeRows(data),
  }
}

export async function getPendingMentorApplications() {
  const supabase = getAdminDataClient()
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select(
      'id, user_id, bio, department, year_of_study, linkedin_url, status, approved_by, approved_at, avg_rating, total_sessions, created_at, application_bio, application_qualifications, years_of_experience, expertise_areas, rejection_reason'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const profiles = await getProfilesByIds(
    supabase,
    normalizeRows(data).map((application) => application.user_id)
  )
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  return {
    applications: normalizeRows(data).map((application) => ({
      ...application,
      profiles: profileMap.get(application.user_id) || null,
    })),
  }
}

export async function getUsersData() {
  const supabase = getAdminDataClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, university_email, role, created_at, account_status, suspension_reason, suspended_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return {
    users: normalizeRows(data),
  }
}

export async function getAnalyticsData() {
  const supabase = getAdminDataClient()

  const [sessionStats, mentorStats, userStats, recentGrowth] = await Promise.all([
    supabase.from('sessions').select('status', { count: 'exact' }),
    supabase.from('mentor_profiles').select('status, is_flagged, is_removed', { count: 'exact' }),
    supabase.from('profiles').select('role, account_status', { count: 'exact' }),
    supabase
      .from('platform_analytics')
      .select('metric_name, metric_value, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(30),
  ])

  const sessions = normalizeRows(sessionStats.data)
  const mentors = normalizeRows(mentorStats.data)
  const users = normalizeRows(userStats.data)

  const sessionCounts = {
    pending: sessions.filter((session) => session.status === 'pending').length,
    confirmed: sessions.filter((session) => session.status === 'confirmed').length,
    completed: sessions.filter((session) => session.status === 'completed').length,
    cancelled: sessions.filter((session) => session.status === 'cancelled').length,
  }

  const mentorCounts = {
    total: mentors.length,
    approved: mentors.filter((mentor) => mentor.status === 'approved').length,
    pending: mentors.filter((mentor) => mentor.status === 'pending').length,
    flagged: mentors.filter((mentor) => mentor.is_flagged || mentor.is_removed).length,
  }

  const userCounts = {
    total: users.length,
    students: users.filter((user) => user.role === 'student').length,
    mentors: users.filter((user) => user.role === 'mentor').length,
    admins: users.filter((user) => user.role === 'admin').length,
  }

  return {
    sessionCounts,
    mentorCounts,
    userCounts,
    recentGrowth: normalizeRows(recentGrowth.data),
    rawSessionTotal: sessionStats.count || 0,
    rawMentorTotal: mentorStats.count || 0,
    rawUserTotal: userStats.count || 0,
  }
}

export async function getFlaggedMentorsData() {
  const supabase = getAdminDataClient()
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select(
      'id, user_id, bio, department, year_of_study, linkedin_url, status, approved_at, avg_rating, total_sessions, created_at, is_flagged, flag_reason, flag_description, flagged_at, is_removed, removed_reason, removed_at'
    )
    .or('is_flagged.eq.true,is_removed.eq.true')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const profiles = await getProfilesByIds(
    supabase,
    normalizeRows(data).map((mentor) => mentor.user_id)
  )
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  return {
    mentors: normalizeRows(data).map((mentor) => ({
      ...mentor,
      profiles: profileMap.get(mentor.user_id) || null,
    })),
  }
}

export async function getSifarishData() {
  const supabase = getAdminDataClient()
  const { data, error } = await supabase
    .from('sifarish_vouches')
    .select(
      'id, session_id, mentor_id, student_id, vouch_text, skills_endorsed, is_public, created_at, vouch_status, verified_by, verified_at, is_fraud_flagged, fraud_flagged_by, fraud_flagged_at'
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw error
  }

  const rows = normalizeRows(data)
  const studentProfiles = await getProfilesByIds(
    supabase,
    rows.map((vouch) => vouch.student_id)
  )
  const mentorProfiles = await supabase
    .from('mentor_profiles')
    .select('id, user_id, bio, department, year_of_study, avg_rating, total_sessions')
    .in('id', [...new Set(rows.map((vouch) => vouch.mentor_id).filter(Boolean))])

  if (mentorProfiles.error) {
    throw mentorProfiles.error
  }

  const mentorUserProfiles = await getProfilesByIds(
    supabase,
    normalizeRows(mentorProfiles.data).map((mentor) => mentor.user_id)
  )

  const studentMap = new Map(studentProfiles.map((profile) => [profile.id, profile]))
  const mentorMap = new Map(
    normalizeRows(mentorProfiles.data).map((mentor) => [
      mentor.id,
      {
        ...mentor,
        profiles: mentorUserProfiles.find((profile) => profile.id === mentor.user_id) || null,
      },
    ])
  )

  return {
    vouches: rows.map((vouch) => ({
      ...vouch,
      student: studentMap.get(vouch.student_id) || null,
      mentor: mentorMap.get(vouch.mentor_id) || null,
    })),
  }
}
