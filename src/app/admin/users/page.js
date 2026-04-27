import styles from './page.module.css'

export const metadata = {
  title: 'User Management | Admin',
}

export default async function UsersPage() {
  // TODO: Fetch users from API
  const users = []

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
          {/* Table content will be implemented */}
        </div>
      )}
    </div>
  )
}
