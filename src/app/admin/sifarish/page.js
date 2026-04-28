import { getSifarishData } from '@/lib/admin-dashboard-data'
import AdminRowActions from '../admin-row-actions'
import styles from './page.module.css'

export const metadata = {
  title: 'Sifarish Vouches | Admin',
}

export default async function SifarishPage() {
  const { vouches } = await getSifarishData()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Sifarish Vouches</h1>
        <p>Verify vouch integrity and detect fraudulent activities</p>
      </div>

      {vouches.length === 0 ? (
        <div className={styles.empty}>
          <p>No vouches pending verification</p>
        </div>
      ) : (
        <div className={styles.table}>
          {vouches.map((vouch) => {
            const student = vouch.student || {}
            const mentor = vouch.mentor?.profiles || {}

            return (
              <article key={vouch.id} className={styles.row}>
                <div>
                  <h3>{student.full_name || 'Anonymous student'}</h3>
                  <p>Mentor: {mentor.full_name || 'Unknown mentor'}</p>
                  <p>{vouch.vouch_text}</p>
                </div>
                <div className={styles.meta}>
                  <span className={styles.badge}>{vouch.vouch_status}</span>
                  <span>{vouch.is_public ? 'Public' : 'Private'}</span>
                  <span>{new Date(vouch.created_at).toLocaleDateString()}</span>
                  <AdminRowActions
                    endpoint={`/api/admin/sifarish/${vouch.id}`}
                    actions={[
                      {
                        label: 'Verify',
                        action: 'verify',
                        variant: 'secondary',
                        confirmMessage: 'Verify this vouch?',
                        successMessage: 'Vouch verified.',
                      },
                      {
                        label: 'Revoke',
                        action: 'revoke',
                        variant: 'danger',
                        confirmMessage: 'Revoke this vouch?',
                        successMessage: 'Vouch revoked.',
                      },
                      {
                        label: 'Flag',
                        action: 'flag',
                        variant: 'warning',
                        confirmMessage: 'Flag this vouch for review?',
                        successMessage: 'Vouch flagged.',
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
