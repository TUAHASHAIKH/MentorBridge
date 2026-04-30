'use client'

import Link from 'next/link'
import { useMentorUser } from './user-context'
import styles from './page.module.css'

const features = [
  {
    title: 'My Sessions',
    description: 'Manage confirmed sessions, mark completions, set meeting links, and write action items for mentees.',
    accent: 'Live',
    href: '/mentor/sessions',
    cta: 'Manage sessions →',
  },
  {
    title: 'My Sifarish',
    description: 'Write verified endorsements for students after completed sessions. View all vouches you have written.',
    accent: 'Live',
    href: '/mentor/sifarish',
    cta: 'View vouches →',
  },
  {
    title: 'Action Items',
    description: 'Create roadmaps with tasks and deadlines for mentees directly from your completed sessions.',
    accent: 'Live',
    href: '/mentor/sessions',
    cta: 'Add action items →',
  },
  {
    title: 'Mentor Profile',
    description: 'Set up your profile, session types, availability, and public bio that students browse.',
    accent: 'Live',
    href: '/mentor/profile',
    cta: 'Edit profile →',
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
          <p>All core tools are live — manage sessions, create action items, and write Sifarish vouches for your mentees.</p>
        </div>

        <div className={styles.grid}>
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href} className={styles.card}>
              <span className={`${styles.cardBadge} ${styles.cardBadgeLive}`}>{feature.accent}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className={styles.cardCta}>{feature.cta}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.infoBar}>
        <p>
          Signed in as <strong>{user?.email}</strong>
        </p>
        <p>
          <Link href="/mentor/profile">Set up your profile and session types →</Link>
        </p>
      </section>
    </div>
  )
}
