import styles from './page.module.css'

export const metadata = {
  title: 'Flagged Mentors | Admin',
}

export default async function FlaggedMentorsPage() {
  // TODO: Fetch flagged mentors from API
  const flagged = []

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
          {/* Table content will be implemented */}
        </div>
      )}
    </div>
  )
}
