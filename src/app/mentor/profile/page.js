'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

const ALL_SESSION_TYPES = [
  { key: 'mock_interview', label: 'Mock Interview', desc: 'Simulate real interview pressure and give structured feedback.' },
  { key: 'cv_review', label: 'CV Review', desc: 'Review and improve students\' CVs for local industry standards.' },
  { key: 'career_guidance', label: 'Career Guidance', desc: 'Share your lived experience and help students make career decisions.' },
  { key: 'project_mentorship', label: 'Project Mentorship', desc: 'Guide students through technical or academic projects.' },
  { key: 'accountability_checkin', label: 'Accountability Check-in', desc: 'Keep students accountable to their goals with regular follow-ups.' },
]

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate Student', 'Alumni']

function ApprovalBadge({ approval }) {
  if (!approval || approval.length === 0) {
    return <span className={`${styles.approvalBadge} ${styles.pending}`}>Pending Admin Review</span>
  }
  const status = approval[0]
  if (status.is_approved) {
    return <span className={`${styles.approvalBadge} ${styles.approved}`}>Approved</span>
  }
  return (
    <span className={`${styles.approvalBadge} ${styles.restricted}`} title={status.restricted_reason || ''}>
      Restricted
    </span>
  )
}

export default function MentorProfilePage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveError, setSaveError] = useState('')

  // Profile fields
  const [bio, setBio] = useState('')
  const [department, setDepartment] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [avgRating, setAvgRating] = useState(0)
  const [totalSessions, setTotalSessions] = useState(0)

  // Session types
  const [sessionTypes, setSessionTypes] = useState([])
  const [addingType, setAddingType] = useState(null) // key being added
  const [addDuration, setAddDuration] = useState(45)
  const [sessionError, setSessionError] = useState('')

  const loadProfile = useCallback(async (tok) => {
    const res = await fetch('/api/mentor/profile', {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (!res.ok) return

    const data = await res.json()
    const mp = data.mentorProfile

    setBio(mp.bio || '')
    setDepartment(mp.department || '')
    setYearOfStudy(mp.year_of_study || '')
    setLinkedinUrl(mp.linkedin_url || '')
    setAvgRating(mp.avg_rating || 0)
    setTotalSessions(mp.total_sessions || 0)
    setSessionTypes(data.sessionTypes || [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setToken(session.access_token)
      await loadProfile(session.access_token)
      setLoading(false)
    })
  }, [loadProfile])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    setSaveError('')

    const res = await fetch('/api/mentor/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bio, department, year_of_study: yearOfStudy, linkedin_url: linkedinUrl }),
    })

    if (res.ok) {
      setSaveMsg('Profile saved.')
      setTimeout(() => setSaveMsg(''), 3000)
    } else {
      const d = await res.json()
      setSaveError(d.error || 'Failed to save.')
    }
    setSaving(false)
  }

  async function handleAddSessionType() {
    if (!addingType) return
    setSessionError('')

    const res = await fetch('/api/mentor/session-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_type: addingType, duration_minutes: addDuration }),
    })

    if (!res.ok) {
      const d = await res.json()
      setSessionError(d.error || 'Failed to add session type.')
      return
    }

    setAddingType(null)
    setAddDuration(45)
    await loadProfile(token)
  }

  async function handleUpdateDuration(id, duration) {
    await fetch(`/api/mentor/session-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ duration_minutes: duration }),
    })
    setSessionTypes((prev) =>
      prev.map((st) => (st.id === id ? { ...st, duration_minutes: duration } : st))
    )
  }

  async function handleRemoveSessionType(id) {
    setSessionError('')
    const res = await fetch(`/api/mentor/session-types/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const d = await res.json()
      setSessionError(d.error || 'Failed to remove session type.')
      return
    }
    setSessionTypes((prev) => prev.filter((st) => st.id !== id))
  }

  const enabledKeys = new Set(sessionTypes.map((st) => st.session_type))
  const availableToAdd = ALL_SESSION_TYPES.filter((t) => !enabledKeys.has(t.key))

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <p className={styles.badge}>My Profile</p>
        <h1>Profile Setup</h1>
        <p className={styles.subtitle}>
          Keep your profile up to date so students know who they are booking with.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totalSessions}</span>
          <span className={styles.statLabel}>Total Sessions</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{Number(avgRating).toFixed(1)}</span>
          <span className={styles.statLabel}>Avg Rating</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{sessionTypes.filter((s) => s.is_active).length}</span>
          <span className={styles.statLabel}>Active Session Types</span>
        </div>
      </div>

      {/* ── Profile info form ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile Info</h2>
        <form className={styles.form} onSubmit={handleSaveProfile}>

          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell students about your background, experience, and what kind of mentorship you offer..."
          />

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="department">Department / Field</label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Computer Science"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="year">Year of Study</label>
              <select id="year" value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)}>
                <option value="">Select year</option>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <label htmlFor="linkedin">LinkedIn URL</label>
          <input
            id="linkedin"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/your-profile"
          />

          {saveError && <p className={styles.error}>{saveError}</p>}
          {saveMsg && <p className={styles.success}>{saveMsg}</p>}

          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Session types ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Session Types</h2>
            <p className={styles.sectionHint}>
              Each type you add is sent to admin for approval before students can book it.
            </p>
          </div>
          {availableToAdd.length > 0 && !addingType && (
            <button
              type="button"
              className={styles.addTypeBtn}
              onClick={() => { setAddingType(availableToAdd[0].key); setSessionError('') }}
            >
              + Add Session Type
            </button>
          )}
        </div>

        {sessionError && <p className={styles.error}>{sessionError}</p>}

        {/* Add new session type panel */}
        {addingType && (
          <div className={styles.addPanel}>
            <div className={styles.addPanelRow}>
              <div className={styles.field}>
                <label>Session Type</label>
                <select value={addingType} onChange={(e) => setAddingType(e.target.value)}>
                  {availableToAdd.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Duration</label>
                <select value={addDuration} onChange={(e) => setAddDuration(Number(e.target.value))}>
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.addPanelActions}>
              <button type="button" className={styles.confirmAddBtn} onClick={handleAddSessionType}>
                Confirm
              </button>
              <button type="button" className={styles.cancelAddBtn} onClick={() => setAddingType(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Enabled session types */}
        {sessionTypes.length === 0 && !addingType && (
          <p className={styles.emptyTypes}>
            You have not added any session types yet. Add one above to get started.
          </p>
        )}

        <div className={styles.typeGrid}>
          {sessionTypes.map((st) => {
            const meta = ALL_SESSION_TYPES.find((t) => t.key === st.session_type)
            return (
              <article key={st.id} className={styles.typeCard}>
                <div className={styles.typeCardTop}>
                  <div>
                    <h3>{meta?.label || st.session_type}</h3>
                    <p className={styles.typeDesc}>{meta?.desc}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.removeTypeBtn}
                    onClick={() => handleRemoveSessionType(st.id)}
                    title="Remove this session type"
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.typeCardBottom}>
                  <div className={styles.durationRow}>
                    <label htmlFor={`dur-${st.id}`}>Duration</label>
                    <select
                      id={`dur-${st.id}`}
                      value={st.duration_minutes}
                      onChange={(e) => handleUpdateDuration(st.id, Number(e.target.value))}
                    >
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d} min</option>
                      ))}
                    </select>
                  </div>
                  <ApprovalBadge approval={st.mentor_approved_session_types} />
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className={styles.backRow}>
        <Link href="/mentor" className={styles.backLink}>← Back to Dashboard</Link>
      </div>
    </div>
  )
}
