'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams.get('suspended')) {
      setError('Your account has been suspended. Contact an administrator.')
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectByRole(session.access_token)
      } else {
        setChecking(false)
      }
    })
  }, [])

  async function redirectByRole(token) {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setChecking(false)
      return
    }
    const profile = await res.json()
    if (profile.role === 'mentor') router.replace('/mentor')
    else if (profile.role === 'admin') router.replace('/admin')
    else router.replace('/student')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message || 'Login failed. Check your credentials.')
      setLoading(false)
      return
    }

    if (data.session) {
      await redirectByRole(data.session.access_token)
    }
    setLoading(false)
  }

  if (checking) {
    return (
      <div className={styles.checking}>
        <span className={styles.spinner} />
      </div>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandBlock}>
            <p className={styles.brandName}>MentorBridge</p>
            <h2>Structured mentorship from peers who have been there.</h2>
            <ul className={styles.featureList}>
              <li>Mock Interviews</li>
              <li>CV Reviews</li>
              <li>Career Guidance</li>
              <li>Project Mentorship</li>
              <li>Accountability Check-ins</li>
            </ul>
          </div>
        </aside>

        <section className={styles.formPanel}>
          <p className={styles.badge}>Student &amp; Mentor</p>
          <h1>Sign In</h1>
          <p className={styles.subtext}>Welcome back. Enter your credentials to continue.</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className={styles.switchLink}>
            No account? <Link href="/register">Create one</Link>
          </p>

          <p className={styles.adminLink}>
            <Link href="/admin/login">Admin portal →</Link>
          </p>
        </section>
      </section>
    </main>
  )
}
