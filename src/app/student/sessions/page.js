'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

const SESSION_TYPE_LABELS = {
  mock_interview: 'Mock Interview',
  cv_review: 'CV Review',
  career_guidance: 'Career Guidance',
  project_mentorship: 'Project Mentorship',
  accountability_checkin: 'Accountability Check-in',
}

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled']

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
}

function StatusBadge({ status }) {
  return <span className={`${styles.badge} ${styles[status] || ''}`}>{status}</span>
}

function SessionCard({ session }) {
  const brief = null // students don't see their own brief here

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <p className={styles.sessionType}>
            {SESSION_TYPE_LABELS[session.session_type] || session.session_type}
          </p>
          <p className={styles.mentorName}>{session.mentor_name}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaItem}>📅 {formatDateTime(session.scheduled_at)}</span>
        <span className={styles.metaItem}>⏱ {session.duration_minutes} min</span>
      </div>

      {session.status === 'pending' && (
        <p className={styles.pendingNote}>
          Waiting for the mentor to confirm your request.
        </p>
      )}

      {session.status === 'confirmed' && session.contact_revealed && session.meeting_link && (
        <div className={styles.linkBox}>
          <p className={styles.linkLabel}>Meeting Link</p>
          <a
            href={session.meeting_link}
            target="_blank"
            rel="noreferrer"
            className={styles.meetingLink}
          >
            {session.meeting_link}
          </a>
        </div>
      )}

      {session.status === 'confirmed' && !session.meeting_link && (
        <p className={styles.pendingNote}>
          Session confirmed — meeting link will appear here once the mentor adds it.
        </p>
      )}

      {session.status === 'completed' && (
        <p className={styles.completedNote}>This session has been completed.</p>
      )}

      {session.status === 'cancelled' && (
        <p className={styles.cancelledNote}>This session was cancelled.</p>
      )}
    </article>
  )
}

export default function StudentSessionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/student/sessions', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Failed to load sessions.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setSessions(data.sessions || [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return sessions
    return sessions.filter((s) => s.status === activeFilter)
  }, [sessions, activeFilter])

  const counts = useMemo(() => {
    const c = { all: sessions.length }
    sessions.forEach((s) => { c[s.status] = (c[s.status] || 0) + 1 })
    return c
  }, [sessions])

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <span className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.pageBadge}>My Sessions</p>
        <h1>Your Sessions</h1>
        <p className={styles.subtitle}>
          Track your booked sessions and access meeting links once confirmed.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!error && (
        <>
          <div className={styles.filterRow}>
            {STATUS_FILTERS.map((f) => (
              counts[f] !== undefined || f === 'all' ? (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${activeFilter === f ? styles.filterActive : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {counts[f] ? <span className={styles.filterCount}>{counts[f]}</span> : null}
                </button>
              ) : null
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>
                {sessions.length === 0
                  ? 'You have not booked any sessions yet.'
                  : `No ${activeFilter} sessions.`}
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
