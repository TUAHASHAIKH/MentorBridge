'use client'

import { usePathname } from 'next/navigation'

import Sidebar from './sidebar'
import styles from './layout.module.css'

export default function AdminShell({ children }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  if (isLoginPage) {
    return <div className={styles.layout}>{children}</div>
  }

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
