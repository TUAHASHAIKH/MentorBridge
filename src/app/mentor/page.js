'use client'

import { useMentorUser } from './user-context'
import styles from './page.module.css'

const upcomingFeatures = [
  {
    title: 'Session Requests',
    description: 'Review incoming booking requests from students. Read their pre-session briefs before accepting.',
    accent: 'Coming Soon',
  },
  {
    title: 'My Sessions',
    description: 'Manage confirmed sessions, mark completions, and set meeting links.',
    accent: 'Coming Soon',
  },
  {
    title: 'Accountability Plans',
    description: 'Create roadmaps with action items and deadlines for mentees after each session.',
    accent: 'Coming Soon',
  },
  {
    title: 'Write Sifarish',
    description: 'Endorse students with a verified vouch after completing a session with them.',
    accent: 'Coming Soon',
  },
]

export default function MentorDashboard() {
  const user = useMentorUser()

  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div>
          <p className={styles.badge}>Mentor Dashboard</p>
          <h1>Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}.</h1>
          <p className={styles.heroSub}>
            Your mentoring hub — review session requests, guide students, and write Sifarish vouches.
          </p>
        </div>

        <div className={styles.accountCard}>
          <p className={styles.accountLabel}>Account</p>
          <p className={styles.accountEmail}>{user?.email}</p>
          <span className={styles.roleBadge}>Mentor</span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Mentor Tools</h2>
          <p>These features are being built — check back soon.</p>
        </div>

        <div className={styles.grid}>
          {upcomingFeatures.map((feature) => (
            <article key={feature.title} className={styles.card}>
              <span className={styles.cardBadge}>{feature.accent}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.infoBar}>
        <p>
          Signed in as <strong>{user?.email}</strong>
        </p>
        <p>Your mentor profile is managed by the admin team.</p>
      </section>
    </div>
  )
}
