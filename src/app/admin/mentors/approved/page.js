import { getApprovedMentorsWithSessionTypes } from '@/lib/admin-dashboard-data'
import MentorSessionPanel from './mentor-session-panel'
import styles from './page.module.css'

export const metadata = {
  title: 'Approved Mentors | Admin',
}

export default async function ApprovedMentorsPage() {
  const { mentors } = await getApprovedMentorsWithSessionTypes()

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.badge}>Mentor Management</p>
          <h1>Approved Mentors</h1>
          <p className={styles.heroText}>
            Review and approve session types for active mentors on the platform.
          </p>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.heroPanelInner}>
            <p className={styles.panelLabel}>Session Types</p>
            <h2>Approve before students can book</h2>
            <p>Each session type a mentor adds needs your review before it becomes bookable.</p>
          </div>
        </div>
      </section>

      <div className={styles.header}>
        <h1>Approved Mentors</h1>
        <p>
          {mentors.length} approved mentor{mentors.length !== 1 ? 's' : ''} on the platform
        </p>
      </div>

      {mentors.length === 0 ? (
        <div className={styles.empty}>
          <p>No approved mentors yet</p>
        </div>
      ) : (
        <div className={styles.list}>
          {mentors.map((mentor) => (
            <MentorSessionPanel key={mentor.id} mentor={mentor} />
          ))}
        </div>
      )}
    </div>
  )
}
