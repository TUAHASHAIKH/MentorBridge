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

function BriefSection({ brief }) {
  const [open, setOpen] = useState(false)
  if (!brief) return null

  const hasContent = brief.goals || brief.background || brief.specific_questions || brief.desired_outcome
  if (!hasContent) return null

  return (
    <div className={styles.briefWrap}>
      <button
        type="button"
        className={styles.briefToggle}
        onClick={() => setOpen((o) => !o)}
      >
        Pre-session brief {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className={styles.briefContent}>
          {brief.goals && (
            <div className={styles.briefField}>
              <p className={styles.briefLabel}>Goals</p>
              <p>{brief.goals}</p>
            </div>
          )}
          {brief.background && (
            <div className={styles.briefField}>
              <p className={styles.briefLabel}>Background</p>
              <p>{brief.background}</p>
            </div>
          )}
          {brief.specific_questions && (
            <div className={styles.briefField}>
              <p className={styles.briefLabel}>Specific Questions</p>
              <p>{brief.specific_questions}</p>
            </div>
          )}
          {brief.desired_outcome && (
            <div className={styles.briefField}>
              <p className={styles.briefLabel}>Desired Outcome</p>
              <p>{brief.desired_outcome}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewSection({ review }) {
  if (!review) return null
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)
  return (
    <div className={styles.reviewBox}>
      <p className={styles.reviewLabel}>Student Rating</p>
      <div className={styles.reviewStars}>{stars}</div>
      {review.feedback && <p className={styles.reviewFeedback}>"{review.feedback}"</p>}
    </div>
  )
}

function SessionCard({ session, token, onUpdate }) {
  const [linkInput, setLinkInput] = useState(session.meeting_link || '')
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cardError, setCardError] = useState('')

  const brief = session.pre_session_briefs?.[0] || null

  async function doAction(action, extra = {}) {
    setBusy(true)
    setCardError('')
    const res = await fetch(`/api/mentor/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setCardError(data.error || 'Action failed.')
      return false
    }
    onUpdate(session.id, data)
    return true
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <p className={styles.sessionType}>
            {SESSION_TYPE_LABELS[session.session_type] || session.session_type}
          </p>
          <p className={styles.studentName}>{session.student_name}</p>
          {session.student_email && (
            <p className={styles.studentEmail}>{session.student_email}</p>
          )}
        </div>
        <StatusBadge status={session.status} />
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaItem}>📅 {formatDateTime(session.scheduled_at)}</span>
        <span className={styles.metaItem}>⏱ {session.duration_minutes} min</span>
      </div>

      <BriefSection brief={brief} />

      {session.status === 'confirmed' && session.meeting_link && (
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

      {session.status === 'completed' && <ReviewSection review={session.review} />}

      {cardError && <p className={styles.cardError}>{cardError}</p>}

      <div className={styles.actions}>
        {session.status === 'pending' && (
          <button
            className={styles.acceptBtn}
            disabled={busy}
            onClick={() => doAction('accept')}
          >
            {busy ? '…' : 'Accept'}
          </button>
        )}

        {session.status === 'pending' && (
          <button
            className={styles.cancelBtn}
            disabled={busy}
            onClick={() => doAction('cancel')}
          >
            Decline
          </button>
        )}

        {session.status === 'confirmed' && !showLinkForm && (
          <button
            className={styles.linkBtn}
            onClick={() => setShowLinkForm(true)}
          >
            {session.meeting_link ? 'Update Link' : '+ Add Meeting Link'}
          </button>
        )}

        {session.status === 'confirmed' && showLinkForm && (
          <div className={styles.linkForm}>
            <input
              type="url"
              placeholder="https://meet.google.com/..."
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
            />
            <button
              className={styles.acceptBtn}
              disabled={busy || !linkInput.trim()}
              onClick={async () => {
                const ok = await doAction('add_link', { meeting_link: linkInput })
                if (ok) setShowLinkForm(false)
              }}
            >
              {busy ? '…' : 'Save'}
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => { setShowLinkForm(false); setLinkInput(session.meeting_link || '') }}
            >
              Cancel
            </button>
          </div>
        )}

        {session.status === 'confirmed' && (
          <button
            className={styles.completeBtn}
            disabled={busy}
            onClick={() => doAction('complete')}
          >
            {busy ? '…' : 'Mark Complete'}
          </button>
        )}

        {session.status === 'confirmed' && (
          <button
            className={styles.cancelBtn}
            disabled={busy}
            onClick={() => doAction('cancel')}
          >
            Cancel Session
          </button>
        )}
      </div>
    </article>
  )
}

export default function MentorSessionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [token, setToken] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setToken(session.access_token)

      const res = await fetch('/api/mentor/sessions', {
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

  function handleUpdate(sessionId, result) {
    if (result.status) {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: result.status } : s))
      )
    } else {
      // meeting link update — refetch to get updated link
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return
        const res = await fetch('/api/mentor/sessions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
        }
      })
    }
  }

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
        <h1>Sessions</h1>
        <p className={styles.subtitle}>
          Accept requests, add meeting links, and mark sessions complete.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!error && (
        <>
          <div className={styles.filterRow}>
            {STATUS_FILTERS.map((f) =>
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
            )}
          </div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>
                {sessions.length === 0
                  ? 'No sessions yet. Students will appear here once they book with you.'
                  : `No ${activeFilter} sessions.`}
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((s) => (
                <SessionCard key={s.id} session={s} token={token} onUpdate={handleUpdate} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
