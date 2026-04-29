import Link from 'next/link'

import styles from './page.module.css'

const sessionTypes = [
  'Mock Interviews',
  'CV Reviews',
  'Career Guidance',
  'Project Mentorship',
  'Accountability Check-ins',
]

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.badge}>MentorBridge</p>
          <h1>Peer mentorship with structure and accountability.</h1>
          <p>
            Connect with senior peers for mock interviews, CV reviews, career guidance, and
            accountability sessions — in a structured, discoverable, and accountable way.
          </p>

          <ul className={styles.sessionTypes}>
            {sessionTypes.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/register">
            Get Started
          </Link>
          <Link className={styles.secondary} href="/login">
            Sign In
          </Link>
        </div>

        <p className={styles.adminHint}>
          Admin?{' '}
          <Link href="/admin/login">Open admin portal →</Link>
        </p>
      </main>
    </div>
  )
}
