import { getPendingMentorApplications } from '@/lib/admin-dashboard-data'
import ApplicationReviewModal from './application-review-modal'
import styles from './page.module.css'

export const metadata = {
  title: 'Mentor Applications | Admin',
}

export default async function MentorApplicationsPage() {
  const { applications } = await getPendingMentorApplications()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Mentor Applications</h1>
        <p>Review and approve pending mentor applications</p>
      </div>

      {applications.length === 0 ? (
        <div className={styles.empty}>
          <p>No pending applications</p>
        </div>
      ) : (
        <div className={styles.table}>
          {applications.map((app) => {
            const profile = app.profiles || {}

            return (
              <article key={app.id} className={styles.row}>
                <div>
                  <h3>{profile.full_name || 'Unnamed applicant'}</h3>
                  <p>{profile.email}</p>
                  <p>{app.department || 'Department not provided'}</p>
                </div>
                <div className={styles.meta}>
                  <span className={styles.badge}>{app.status}</span>
                  <span>{app.years_of_experience ? `${app.years_of_experience} years` : 'Experience not set'}</span>
                  <ApplicationReviewModal application={app} />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
