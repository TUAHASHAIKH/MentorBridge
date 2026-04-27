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
      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandBlock}>
            <img
              className={styles.logoSlot}
              src="/admin-logo.png"
              alt="MentorBridge Admin Logo"
            />
          </div>
        </aside>

        <section className={styles.formPanel}>
          <p className={styles.badge}>Admin Only</p>
          <h1>Welcome</h1>
          <p className={styles.subtext}>Please log in to admin dashboard.</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="admin-email">Username</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
            />

            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
            />

            {error ? <p className={styles.error}>{error}</p> : null}

            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </section>
      </section>
    </main>
  )
}
