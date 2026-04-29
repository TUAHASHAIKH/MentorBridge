'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmEmail, setConfirmEmail] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Step 1: Create Supabase auth user
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message || 'Registration failed.')
      setLoading(false)
      return
    }

    // Email confirmation is enabled — user must verify before getting a session
    if (!data.session) {
      setConfirmEmail(true)
      setLoading(false)
      return
    }

    // Step 2: Create profile row in DB
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: data.session.access_token,
        full_name: fullName,
        email,
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      setError(body.error || 'Failed to create profile. Please try again.')
      setLoading(false)
      return
    }

    router.push('/student')
  }

  if (confirmEmail) {
    return (
      <main className={styles.page}>
        <div className={styles.confirmBox}>
          <p className={styles.confirmIcon}>✉</p>
          <h2>Check your email</h2>
          <p>
            We sent a confirmation link to <strong>{email}</strong>.
            Open it, then <Link href="/login">sign in here</Link>.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandBlock}>
            <p className={styles.brandName}>MentorBridge</p>
            <h2>Your journey to a better career starts here.</h2>
            <p className={styles.brandDesc}>
              Connect with senior peers for structured mentorship sessions.
              Book mock interviews, get your CV reviewed, and build accountability plans — all in one place.
            </p>
            <p className={styles.mentorNote}>
              Want to become a mentor? Register as a student first, then apply from your dashboard.
            </p>
          </div>
        </aside>

        <section className={styles.formPanel}>
          <p className={styles.badge}>Create Account</p>
          <h1>Get Started</h1>
          <p className={styles.subtext}>Register as a student. Free to join.</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />

            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu.pk"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className={styles.switchLink}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  )
}
