'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { StudentUserContext } from './user-context'
import styles from './layout.module.css'

const navLinks = [
  { href: '/student', label: 'Dashboard', exact: true },
  { href: '/student/apply-mentor', label: 'Apply as Mentor' },
  { href: '/student/mentors', label: 'Browse Mentors' },
  { href: '/student/sessions', label: 'My Sessions' },
  { href: '/student/sifarish', label: 'My Vouches' },
  { href: '/student/action-items', label: 'Action Items', soon: true },
  { href: '/student/profile', label: 'My Profile', soon: true },
]

export default function StudentLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      const profile = await res.json()

      if (profile.account_status === 'suspended') {
        await supabase.auth.signOut()
        router.replace('/login?suspended=1')
        return
      }

      if (profile.role === 'mentor') {
        router.replace('/mentor')
        return
      }

      if (profile.role === 'admin') {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      setUser(profile)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.spinner} />
      </div>
    )
  }

  return (
    <StudentUserContext.Provider value={user}>
      <div className={styles.shell}>
        <header className={styles.navbar}>
          <Link href="/student" className={styles.brand}>
            <span className={styles.brandDot} />
            MentorBridge
          </Link>

          <nav className={styles.nav}>
            {navLinks.map((link) => {
              const isActive = link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.soon ? '#' : link.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ''} ${link.soon ? styles.soon : ''}`}
                  onClick={link.soon ? (e) => e.preventDefault() : undefined}
                >
                  {link.label}
                  {link.soon && <span className={styles.soonTag}>Soon</span>}
                </Link>
              )
            })}
          </nav>

          <div className={styles.userArea}>
            <div className={styles.avatar}>
              {(user.full_name || user.email)[0].toUpperCase()}
            </div>
            <span className={styles.userName}>{user.full_name || user.email}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Sign Out
            </button>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </StudentUserContext.Provider>
  )
}
