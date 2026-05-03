'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

const SESSION_TYPE_LABELS = {
  mock_interview: 'Mock Interview',
  cv_review: 'CV Review',
  career_guidance: 'Career Guidance',
  project_mentorship: 'Project Mentorship',
  accountability_checkin: 'Accountability Check-in',
}

function getMinDatetime() {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setSeconds(0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initialsFor(name) {
  return (name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function BookingModal({ mentor, token, onClose, onSuccess }) {
  const [sessionType, setSessionType] = useState(mentor.session_types[0]?.session_type || '')
  const [scheduledAt, setScheduledAt] = useState(getMinDatetime)
  const [goals, setGoals] = useState('')
  const [background, setBackground] = useState('')
  const [questions, setQuestions] = useState('')
  const [outcome, setOutcome] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedType = mentor.session_types.find((st) => st.session_type === sessionType)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!goals.trim()) {
      setError('Please describe what you want to achieve in this session.')
      return
    }

    setSubmitting(true)
    setError('')

    const res = await fetch('/api/student/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mentor_id: mentor.id,
        session_type: sessionType,
        duration_minutes: selectedType?.duration_minutes,
        scheduled_at: new Date(scheduledAt).toISOString(),
        goals,
        background,
        specific_questions: questions,
        desired_outcome: outcome,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error || 'Booking failed. Please try again.')
      return
    }

    onSuccess()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalBadge}>Book a Session</p>
            <h2>{mentor.full_name || 'Mentor'}</h2>
            <p>{mentor.department || 'MentorBridge mentor'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close booking form">
            x
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalRow}>
            <div className={styles.field}>
              <label>Session Type</label>
              <select value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
                {mentor.session_types.map((st) => (
                  <option key={st.id} value={st.session_type}>
                    {SESSION_TYPE_LABELS[st.session_type] || st.session_type} ({st.duration_minutes} min)
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Preferred Date and Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={getMinDatetime()}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>What do you want to achieve?</label>
            <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} required />
          </div>

          <div className={styles.field}>
            <label>Tell the mentor about yourself</label>
            <textarea value={background} onChange={(e) => setBackground(e.target.value)} rows={2} />
          </div>

          <div className={styles.modalRow}>
            <div className={styles.field}>
              <label>Specific questions</label>
              <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={2} />
            </div>
            <div className={styles.field}>
              <label>Desired outcome</label>
              <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} />
            </div>
          </div>

          {error && <p className={styles.modalError}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="submit" className={styles.primaryBtn} disabled={submitting}>
              {submitting ? 'Sending Request...' : 'Send Booking Request'}
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SuccessModal({ mentor, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.successModal}`} onClick={(e) => e.stopPropagation()}>
        <h2>Request Sent</h2>
        <p>Your booking request has been sent to {mentor.full_name || 'the mentor'}.</p>
        <button className={styles.primaryBtn} onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

export default function StudentMentorProfilePage() {
  const router = useRouter()
  const params = useParams()
  const mentorId = params?.id
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  useEffect(() => {
    if (!mentorId) return

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

      setToken(session.access_token)
      const res = await fetch(`/api/student/mentors/${mentorId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(payload.error || 'Failed to load mentor profile.')
        setLoading(false)
        return
      }

      setData(payload)
      setLoading(false)
    })
  }, [mentorId, router])

  const mentor = data?.mentor
  const ratingLabel = useMemo(() => {
    if (!mentor?.avg_rating || Number(mentor.avg_rating) <= 0) return 'New mentor'
    return `${Number(mentor.avg_rating).toFixed(1)} / 5`
  }, [mentor])

  function closeModal() {
    setBookingOpen(false)
    setBookingSuccess(false)
  }

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <span className={styles.spinner} />
      </div>
    )
  }

  if (error || !mentor) {
    return (
      <div className={styles.page}>
        <Link href="/student/mentors" className={styles.backLink}>Back to mentors</Link>
        <p className={styles.error}>{error || 'Mentor profile is unavailable.'}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link href="/student/mentors" className={styles.backLink}>Back to mentors</Link>

      <div className={styles.profileGrid}>
        <main className={styles.mainColumn}>
          <section className={styles.hero}>
            <div className={styles.avatar}>{initialsFor(mentor.full_name)}</div>
            <div>
              <p className={styles.badge}>Verified Mentor</p>
              <h1>{mentor.full_name || 'Anonymous Mentor'}</h1>
              <p className={styles.meta}>
                {[mentor.department, mentor.year_of_study].filter(Boolean).join(' / ') || 'MentorBridge mentor'}
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>About</h2>
            <p className={styles.bodyText}>
              {mentor.bio || 'This mentor has not added a detailed bio yet.'}
            </p>
          </section>

          {mentor.expertise_areas?.length > 0 && (
            <section className={styles.section}>
              <h2>Expertise</h2>
              <div className={styles.tagRow}>
                {mentor.expertise_areas.map((tag) => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h2>Session Types</h2>
            <div className={styles.sessionList}>
              {mentor.session_types.map((st) => (
                <article key={st.id} className={styles.sessionItem}>
                  <div>
                    <h3>{SESSION_TYPE_LABELS[st.session_type] || st.session_type}</h3>
                    <p>{st.duration_minutes} minute session</p>
                  </div>
                  <span className={styles.approvedChip}>Approved</span>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2>Availability</h2>
            <p className={styles.bodyText}>{mentor.availability?.summary}</p>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2>Student Reviews</h2>
              <span>{mentor.review_count || 0}</span>
            </div>
            {data.reviews.length === 0 ? (
              <p className={styles.bodyText}>No written reviews yet.</p>
            ) : (
              <div className={styles.reviewList}>
                {data.reviews.map((review) => (
                  <article key={review.id} className={styles.quoteCard}>
                    <div className={styles.quoteHead}>
                      <strong>{Number(review.rating).toFixed(1)} / 5</strong>
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                    <p>{review.feedback}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

        </main>

        <aside className={styles.sideColumn}>
          <div className={styles.bookingPanel}>
            <div className={styles.statGrid}>
              <div>
                <strong>{ratingLabel}</strong>
                <span>Rating</span>
              </div>
              <div>
                <strong>{mentor.total_sessions || 0}</strong>
                <span>Sessions</span>
              </div>
              <div>
                <strong>{mentor.session_types.length}</strong>
                <span>Types</span>
              </div>
            </div>

            <button className={styles.primaryBtn} onClick={() => setBookingOpen(true)}>
              Book a Session
            </button>
            <p className={styles.privacyNote}>Contact details are hidden until a session is confirmed.</p>
          </div>
        </aside>
      </div>

      {bookingOpen && !bookingSuccess && (
        <BookingModal
          mentor={mentor}
          token={token}
          onClose={closeModal}
          onSuccess={() => setBookingSuccess(true)}
        />
      )}

      {bookingOpen && bookingSuccess && (
        <SuccessModal mentor={mentor} onClose={closeModal} />
      )}
    </div>
  )
}
