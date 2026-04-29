'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MentorUserContext } from './user-context'
import styles from './layout.module.css'

const navLinks = [
  { href: '/mentor', label: 'Dashboard', exact: true },
  { href: '/mentor/requests', label: 'Session Requests', soon: true },
  { href: '/mentor/sessions', label: 'My Sessions', soon: true },
  { href: '/mentor/sifarish', label: 'Write Sifarish', soon: true },
  { href: '/mentor/profile', label: 'My Profile', soon: true },
]

export default function MentorLayout({ children }) {
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

      // Only approved mentors (role='mentor') can access this portal
      if (profile.role !== 'mentor') {
        router.replace('/student')
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
    <MentorUserContext.Provider value={user}>
      <div className={styles.shell}>
        <header className={styles.navbar}>
          <Link href="/mentor" className={styles.brand}>
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
    </MentorUserContext.Provider>
  )
}
