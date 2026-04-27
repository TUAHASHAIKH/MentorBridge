import Link from 'next/link'

import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.badge}>MentorBridge</p>
          <h1>Peer mentorship with structure and accountability.</h1>
          <p>
            Start with the isolated admin portal to verify seeded admin access, lockout behavior, and
            inactivity timeout policy.
          </p>
        </div>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/admin/login">
            Open Admin Portal
          </Link>
        </div>
      </main>
    </div>
  )
}
