import CreateAdminForm from '../create-admin-form'
import styles from './page.module.css'

export const metadata = {
  title: 'Manage Admins | MentorBridge',
}

export default function ManageAdminsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.badge}>Admin Tools</p>
          <h1>Manage Admins</h1>
          <p className={styles.heroText}>
            Create new admins and promote trusted users from one secure place.
          </p>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.heroPanelInner}>
            <p className={styles.panelLabel}>Access Control</p>
            <h2>Trusted operators only</h2>
            <p>Keep the platform secure by limiting admin access to verified staff.</p>
          </div>
        </div>
      </section>

      <section className={styles.contentGrid}>
        <CreateAdminForm title="Create Admin" description="Only admins can create or promote new admin accounts." />

        <div className={styles.sideCard}>
          <p className={styles.sideBadge}>Quick Notes</p>
          <h3>What admins can do</h3>
          <ul>
            <li>Verify and approve mentor applications</li>
            <li>Approve or restrict session types per mentor</li>
            <li>Monitor platform activity and analytics</li>
            <li>Flag or remove unqualified mentors</li>
            <li>Manage user accounts</li>
            <li>Oversee Sifarish vouch integrity</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
