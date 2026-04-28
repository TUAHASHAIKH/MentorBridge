import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ADMIN_SESSION_COOKIE, deleteAdminSessionByToken, validateAdminSession } from '@/lib/admin-session'
import { getAdminDashboardOverview } from '@/lib/admin-dashboard-data'

import styles from './page.module.css'

async function logout() {
  'use server'

  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  await deleteAdminSessionByToken(token)
  cookieStore.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  redirect('/admin/login')
}

const featureCards = [
  {
    title: 'Manage Admins',
    description: 'Create, promote, and manage other admin accounts from one place.',
    href: '/admin/admins',
    accent: 'Admins',
  },
  {
    title: 'Mentor Applications',
    description: 'Review, approve, or reject mentor onboarding requests.',
    href: '/admin/mentors/applications',
    accent: 'Mentors',
  },
  {
    title: 'Session Types',
    description: 'Approve or restrict session types per mentor when needed.',
    href: '/admin/mentors/flagged',
    accent: 'Control',
  },
  {
    title: 'User Management',
    description: 'Suspend, restore, or update user account status.',
    href: '/admin/users',
    accent: 'Users',
  },
  {
    title: 'Analytics',
    description: 'Monitor platform activity, session health, and growth.',
    href: '/admin/analytics',
    accent: 'Stats',
  },
  {
    title: 'Sifarish Integrity',
    description: 'Inspect vouches and flag suspicious activity.',
    href: '/admin/sifarish',
    accent: 'Trust',
  },
]

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const session = await validateAdminSession(sessionToken, { touch: true })

  if (!session.valid) {
    redirect('/admin/login')
  }

  const { stats, recentLogs } = await getAdminDashboardOverview()

  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.badge}>Admin Only</p>
          <h1>Welcome back, {session.user.fullName || 'Admin'}</h1>
          <p className={styles.heroText}>
            Use the dashboard to review mentors, manage users, monitor analytics, and keep the platform secure.
          </p>

          <div className={styles.heroActions}>
            <Link href="/admin/admins" className={styles.primaryLink}>
              Manage Admins
            </Link>
            <form action={logout}>
              <button type="submit" className={styles.secondaryButton}>
                Sign Out
              </button>
            </form>
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.heroPanelInner}>
            <p className={styles.panelLabel}>Secure Control Panel</p>
            <h2>MentorBridge</h2>
            <p>Everything an admin needs, organized in one clean workspace.</p>
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        {featureCards.map((card) => (
          <article key={card.title} className={styles.card}>
            <p className={styles.cardBadge}>{card.accent}</p>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <Link href={card.href} className={styles.cardLink}>
              Open {card.title} →
            </Link>
          </article>
        ))}
      </section>

      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <span>Mentor Applications</span>
          <strong>{stats.pendingApplications}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Active Users</span>
          <strong>{stats.activeUsers}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Active Sessions</span>
          <strong>{stats.activeSessions}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Flagged Mentors</span>
          <strong>{stats.flaggedMentors}</strong>
        </div>
      </section>

      <section className={styles.logsSection}>
        <div className={styles.sectionHeader}>
          <h2>Recent Admin Activity</h2>
          <p>Latest moderation and admin-management actions</p>
        </div>

        {recentLogs.length === 0 ? (
          <p className={styles.emptyState}>No admin audit logs yet.</p>
        ) : (
          <div className={styles.logList}>
            {recentLogs.map((log) => (
              <article key={log.id} className={styles.logItem}>
                <div>
                  <h3>{log.action}</h3>
                  <p>{log.target_email}</p>
                </div>
                <time>{new Date(log.created_at).toLocaleString()}</time>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.infoBar}>
        <p>
          Signed in as <strong>{session.user.email}</strong>
        </p>
      </section>
    </div>
  )
}
