import styles from './page.module.css'

export const metadata = {
  title: 'Sifarish Vouches | Admin',
}

export default async function SifarishPage() {
  // TODO: Fetch sifarish vouches from API
  const vouches = []

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
          {/* Table content will be implemented */}
        </div>
      )}
    </div>
  )
}
