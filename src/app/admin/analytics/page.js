import styles from './page.module.css'

export const metadata = {
  title: 'Analytics | Admin',
}

export default async function AnalyticsPage() {
  // TODO: Fetch analytics data from API
  const stats = {
    totalMentors: 0,
    totalStudents: 0,
    activeSessions: 0,
    completedSessions: 0,
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Platform Analytics</h1>
        <p>Monitor platform activity and metrics</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.totalMentors}</div>
          <div className={styles.statLabel}>Active Mentors</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.totalStudents}</div>
          <div className={styles.statLabel}>Total Students</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.activeSessions}</div>
          <div className={styles.statLabel}>Active Sessions</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{stats.completedSessions}</div>
          <div className={styles.statLabel}>Completed Sessions</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Recent Activity</h2>
        <p>Activity timeline will be displayed here</p>
      </div>
    </div>
  )
}
