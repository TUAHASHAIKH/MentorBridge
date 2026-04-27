'use client'

import { useState } from 'react'

import styles from './page.module.css'

export default function CreateAdminForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [resetPassword, setResetPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/users/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          resetPassword,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Unable to create admin.')
        return
      }

      const modeText = payload.mode === 'created_new_user' ? 'created' : 'promoted'
      setSuccess(`Admin ${modeText} successfully for ${payload.email}.`)

      setEmail('')
      setPassword('')
      setFullName('')
      setResetPassword(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={styles.subCard}>
      <h2>Create Another Admin</h2>
      <p className={styles.subText}>Only currently authenticated admins can perform this action.</p>

      <form className={styles.form} onSubmit={onSubmit}>
        <label htmlFor="new-admin-email">Admin email</label>
        <input
          id="new-admin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="new-admin-password">Temporary password</label>
        <input
          id="new-admin-password"
          type="password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <label htmlFor="new-admin-name">Full name (optional)</label>
        <input
          id="new-admin-name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />

        <label className={styles.checkboxLine} htmlFor="reset-password">
          <input
            id="reset-password"
            type="checkbox"
            checked={resetPassword}
            onChange={(event) => setResetPassword(event.target.checked)}
          />
          Reset password if account already exists
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}
        {success ? <p className={styles.success}>{success}</p> : null}

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Create Admin'}
        </button>
      </form>
    </section>
  )
}
