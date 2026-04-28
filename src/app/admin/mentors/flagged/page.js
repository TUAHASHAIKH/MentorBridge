import { getFlaggedMentorsData } from '@/lib/admin-dashboard-data'
import AdminRowActions from '../../admin-row-actions'
import styles from './page.module.css'

export const metadata = {
  title: 'Flagged Mentors | Admin',
}

export default async function FlaggedMentorsPage() {
  const { mentors: flagged } = await getFlaggedMentorsData()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Flagged Mentors</h1>
        <p>Review and manage mentors flagged for quality issues</p>
      </div>

      {flagged.length === 0 ? (
        <div className={styles.empty}>
          <p>No flagged mentors</p>
        </div>
      ) : (
        <div className={styles.table}>
          {flagged.map((mentor) => {
            const profile = mentor.profiles || {}

            return (
              <article key={mentor.id} className={styles.row}>
                <div>
                  <h3>{profile.full_name || 'Unnamed mentor'}</h3>
                  <p>{profile.email}</p>
                  <p>{mentor.department || 'Department not set'}</p>
                </div>
                <div className={styles.meta}>
                  <span className={styles.badge}>{mentor.is_removed ? 'removed' : 'flagged'}</span>
                  <span>{mentor.flag_reason || mentor.removed_reason || 'No reason provided'}</span>
                  <span>{new Date(mentor.created_at).toLocaleDateString()}</span>
                  <AdminRowActions
                    endpoint={`/api/admin/mentors/flagged/${mentor.id}`}
                    actions={[
                      {
                        label: mentor.is_removed ? 'Restore' : 'Remove',
                        action: mentor.is_removed ? 'restore' : 'remove',
                        variant: mentor.is_removed ? 'secondary' : 'danger',
                        confirmMessage: mentor.is_removed
                          ? 'Restore this mentor?'
                          : 'Remove this mentor from the platform?',
                        requiresReason: !mentor.is_removed,
                        reasonPrompt: mentor.is_removed ? '' : 'Enter a removal reason',
                        successMessage: mentor.is_removed ? 'Mentor restored.' : 'Mentor removed.',
                      },
                    ]}
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
