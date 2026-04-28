import { getAnalyticsData } from '@/lib/admin-dashboard-data'
import styles from './page.module.css'

export const metadata = {
  title: 'Analytics | Admin',
}

export default async function AnalyticsPage() {
  const { mentorCounts, userCounts, sessionCounts, recentGrowth } = await getAnalyticsData()

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.badge}>Insights</p>
          <h1>Platform Analytics</h1>
          <p className={styles.heroText}>
            Monitor platform metrics, growth trends, and user engagement statistics.
          </p>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.heroPanelInner}>
            <p className={styles.panelLabel}>Data-Driven Decisions</p>
            <h2>Real-time metrics</h2>
            <p>Make informed decisions based on comprehensive platform analytics.</p>
          </div>
        </div>
      </section>

      <div className={styles.header}>
        <h1>Platform Analytics</h1>
        <p>Monitor platform activity and metrics</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{mentorCounts.total}</div>
          <div className={styles.statLabel}>Active Mentors</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{userCounts.students}</div>
          <div className={styles.statLabel}>Total Students</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{sessionCounts.confirmed + sessionCounts.pending}</div>
          <div className={styles.statLabel}>Active Sessions</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{sessionCounts.completed}</div>
          <div className={styles.statLabel}>Completed Sessions</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Recent Activity</h2>
        {recentGrowth.length === 0 ? (
          <p>No analytics snapshots available yet.</p>
        ) : (
          <div className={styles.snapshots}>
            {recentGrowth.map((item) => (
              <article key={`${item.metric_name}-${item.recorded_at}`} className={styles.snapshot}>
                <strong>{item.metric_name}</strong>
                <span>{item.metric_value}</span>
                <small>{item.recorded_at}</small>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
