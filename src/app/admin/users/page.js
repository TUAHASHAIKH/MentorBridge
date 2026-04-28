import { getUsersData } from '@/lib/admin-dashboard-data'
import AdminRowActions from '../admin-row-actions'
import styles from './page.module.css'

export const metadata = {
  title: 'User Management | Admin',
}

export default async function UsersPage() {
  const { users } = await getUsersData()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>User Management</h1>
        <p>Manage and monitor all users on the platform</p>
      </div>

      {users.length === 0 ? (
        <div className={styles.empty}>
          <p>No users found</p>
        </div>
      ) : (
        <div className={styles.table}>
          {users.map((user) => (
            <article key={user.id} className={styles.row}>
              <div>
                <h3>{user.full_name || 'Unnamed user'}</h3>
                <p>{user.email}</p>
                <p>{user.university_email || 'University email not set'}</p>
              </div>
              <div className={styles.meta}>
                <span className={styles.badge}>{user.role}</span>
                <span className={styles.status}>{user.account_status}</span>
                <span>{new Date(user.created_at).toLocaleDateString()}</span>
                <AdminRowActions
                  endpoint={`/api/admin/users/${user.id}`}
                  actions={
                    user.account_status === 'suspended'
                      ? [
                          {
                            label: 'Unsuspend',
                            action: 'unsuspend',
                            variant: 'secondary',
                            confirmMessage: 'Restore this user account?',
                            successMessage: 'User restored to active status.',
                          },
                        ]
                      : [
                          {
                            label: 'Suspend',
                            action: 'suspend',
                            variant: 'danger',
                            confirmMessage: 'Suspend this user account?',
                            requiresReason: true,
                            reasonPrompt: 'Enter a suspension reason',
                            successMessage: 'User suspended.',
                          },
                        ]
                  }
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
