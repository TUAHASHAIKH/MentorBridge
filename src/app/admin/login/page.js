'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import styles from './page.module.css'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Login failed.')
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Unable to reach server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.badge}>Admin Only</p>
        <h1>MentorBridge Admin Portal</h1>
        <p className={styles.subtext}>Use your seeded admin account to continue.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Admin Email</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? <p className={styles.error}>{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in as Admin'}
          </button>
        </form>
      </section>
    </main>
  )
}
