'use client'

import Link from 'next/link'
import { useStudentUser } from './user-context'
import styles from './page.module.css'

const upcomingFeatures = [
  {
    title: 'Browse Mentors',
    description: 'Find senior peers who offer mock interviews, CV reviews, career guidance, and more. Filter by session type.',
    accent: 'Live',
    href: '/student/mentors',
  },
  {
    title: 'Book a Session',
    description: 'Submit a pre-session brief and request a slot. Mentor contact is revealed only after confirmation.',
    accent: 'Coming Soon',
    href: '#',
  },
  {
    title: 'Action Items',
    description: 'Track roadmap tasks and deadlines set by your mentor after each session.',
    accent: 'Coming Soon',
    href: '#',
  },
  {
    title: 'Sifarish Vouches',
    description: 'Collect verified endorsements from mentors on your profile after completed sessions.',
    accent: 'Coming Soon',
    href: '#',
  },
]

export default function StudentDashboard() {
  const user = useStudentUser()

  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div>
          <p className={styles.badge}>Student Dashboard</p>
          <h1>Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}.</h1>
          <p className={styles.heroSub}>
            Your mentorship hub — find mentors, book sessions, and track your progress.
          </p>
        </div>

        <div className={styles.accountCard}>
          <p className={styles.accountLabel}>Account</p>
          <p className={styles.accountEmail}>{user?.email}</p>
          <span className={styles.roleBadge}>Student</span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Platform Features</h2>
          <p>Browse Mentors is live. More features coming soon.</p>
        </div>

        <div className={styles.grid}>
          {upcomingFeatures.map((feature) => {
            const isLive = feature.href !== '#'
            const inner = (
              <>
                <span className={`${styles.cardBadge} ${isLive ? styles.cardBadgeLive : ''}`}>
                  {feature.accent}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                {isLive && <span className={styles.cardCta}>Browse now →</span>}
              </>
            )
            return isLive ? (
              <Link key={feature.title} href={feature.href} className={styles.card}>
                {inner}
              </Link>
            ) : (
              <article key={feature.title} className={styles.card}>
                {inner}
              </article>
            )
          })}
        </div>
      </section>

      <section className={styles.infoBar}>
        <p>
          Signed in as <strong>{user?.email}</strong>
        </p>
        <p>
          Want to mentor others?{' '}
          <Link href="/student/apply-mentor">Apply as a mentor →</Link>
        </p>
      </section>
    </div>
  )
}
