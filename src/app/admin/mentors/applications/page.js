import Link from 'next/link'
import styles from './page.module.css'

export const metadata = {
  title: 'Mentor Applications | Admin',
}

export default async function MentorApplicationsPage() {
  // TODO: Fetch pending mentor applications from API
  const applications = []

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
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Experience</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id}>
                <td>{app.name}</td>
                <td>{app.email}</td>
                <td>{app.years_of_experience} years</td>
                <td>
                  <span className={styles.badge}>{app.status}</span>
                </td>
                <td>
                  <Link href={`/admin/mentors/applications/${app.id}`}>
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </div>
      )}
    </div>
  )
}
