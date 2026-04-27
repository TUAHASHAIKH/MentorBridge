'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import styles from './sidebar.module.css'

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (path) => pathname === path || pathname.startsWith(path + '/')

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logoWrap}>
          <Image src="/admin-logo.png" alt="MentorBridge" width={220} height={90} className={styles.logo} />
        </div>
        <p className={styles.brandText}>Admin control center</p>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <p className={styles.sectionTitle}>Main</p>
          <ul className={styles.menu}>
            <li>
              <Link
                href="/admin"
                className={`${styles.menuItem} ${isActive('/admin') && pathname === '/admin' ? styles.active : ''}`}
              >
                Dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div className={styles.navSection}>
          <p className={styles.sectionTitle}>Mentors</p>
          <ul className={styles.menu}>
            <li>
              <Link
                href="/admin/admins"
                className={`${styles.menuItem} ${isActive('/admin/admins') ? styles.active : ''}`}
              >
                Manage Admins
              </Link>
            </li>
            <li>
              <Link
                href="/admin/mentors/applications"
                className={`${styles.menuItem} ${isActive('/admin/mentors/applications') ? styles.active : ''}`}
              >
                Applications
              </Link>
            </li>
            <li>
              <Link
                href="/admin/mentors/flagged"
                className={`${styles.menuItem} ${isActive('/admin/mentors/flagged') ? styles.active : ''}`}
              >
                Flagged Mentors
              </Link>
            </li>
          </ul>
        </div>

        <div className={styles.navSection}>
          <p className={styles.sectionTitle}>Platform</p>
          <ul className={styles.menu}>
            <li>
              <Link
                href="/admin/users"
                className={`${styles.menuItem} ${isActive('/admin/users') ? styles.active : ''}`}
              >
                Users
              </Link>
            </li>
            <li>
              <Link
                href="/admin/analytics"
                className={`${styles.menuItem} ${isActive('/admin/analytics') ? styles.active : ''}`}
              >
                Analytics
              </Link>
            </li>
            <li>
              <Link
                href="/admin/sifarish"
                className={`${styles.menuItem} ${isActive('/admin/sifarish') ? styles.active : ''}`}
              >
                Sifarish Vouches
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  )
}
