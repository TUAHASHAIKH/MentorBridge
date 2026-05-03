'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

const SESSION_FILTERS = [
  { key: 'all', label: 'All Types' },
  { key: 'mock_interview', label: 'Mock Interview' },
  { key: 'cv_review', label: 'CV Review' },
  { key: 'career_guidance', label: 'Career Guidance' },
  { key: 'project_mentorship', label: 'Project Mentorship' },
  { key: 'accountability_checkin', label: 'Accountability Check-in' },
]

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

// ── Booking modal ─────────────────────────────────────────────────────────────

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

  const minDatetime = getMinDatetime()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalBadge}>Book a Session</p>
            <h2>{mentor.full_name || 'Mentor'}</h2>
            {mentor.department && (
              <p className={styles.modalMeta}>{mentor.department}</p>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button">✕</button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalRow}>
            <div className={styles.modalField}>
              <label>Session Type</label>
              <select value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
                {mentor.session_types.map((st) => (
                  <option key={st.id} value={st.session_type}>
                    {SESSION_TYPE_LABELS[st.session_type]} ({st.duration_minutes} min)
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.modalField}>
              <label>Preferred Date &amp; Time <span className={styles.req}>*</span></label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={minDatetime}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.briefSection}>
            <p className={styles.briefTitle}>Pre-Session Brief</p>
            <p className={styles.briefHint}>
              Help your mentor prepare. The more context you give, the better the session.
            </p>
          </div>

          <div className={styles.modalField}>
            <label>What do you want to achieve? <span className={styles.req}>*</span></label>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g., I want to practice answering behavioral questions and get structured feedback on my responses..."
              rows={3}
            />
          </div>

          <div className={styles.modalField}>
            <label>Tell the mentor about yourself</label>
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="e.g., 3rd year CS student, applying for SWE internships, have done 2 interviews so far..."
              rows={2}
            />
          </div>

          <div className={styles.modalRow}>
            <div className={styles.modalField}>
              <label>Specific questions or topics</label>
              <textarea
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder="e.g., How to answer 'tell me about yourself'? How to handle tricky HR questions..."
                rows={2}
              />
            </div>
            <div className={styles.modalField}>
              <label>What does success look like?</label>
              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="e.g., Leave with a structured answer framework I can use in real interviews..."
                rows={2}
              />
            </div>
          </div>

          {error && <p className={styles.modalError}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Sending Request…' : 'Send Booking Request'}
            </button>
            <button type="button" className={styles.cancelModalBtn} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BookingSuccess({ mentor, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.successContent}>
          <div className={styles.successIcon}>✓</div>
          <h2>Request Sent!</h2>
          <p>
            Your booking request has been sent to <strong>{mentor.full_name}</strong>.
            They will review your pre-session brief and confirm the session.
          </p>
          <p className={styles.successNote}>
            You will see the session in <strong>My Sessions</strong> once confirmed.
          </p>
          <button className={styles.submitBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Mentor card ────────────────────────────────────────────────────────────────

function StarRating({ value }) {
  const rounded = Math.round(Number(value) * 2) / 2
  return (
    <span className={styles.rating} title={`${rounded} out of 5`}>
      {'★'.repeat(Math.floor(rounded))}
      {rounded % 1 !== 0 ? '½' : ''}
      {'☆'.repeat(Math.max(0, 5 - Math.ceil(rounded)))}
      <span className={styles.ratingNum}>{Number(value).toFixed(1)}</span>
    </span>
  )
}

function MentorCard({ mentor, onBook }) {
  const initials = (mentor.full_name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const bioSnippet = mentor.bio
    ? mentor.bio.length > 120
      ? mentor.bio.slice(0, 120).trimEnd() + '…'
      : mentor.bio
    : null

  const expertiseTags = (mentor.expertise_areas || []).slice(0, 4)
  const hasRating = mentor.avg_rating && Number(mentor.avg_rating) > 0

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.identity}>
          <h3>{mentor.full_name || 'Anonymous Mentor'}</h3>
          <p className={styles.meta}>
            {[mentor.department, mentor.year_of_study].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {bioSnippet && <p className={styles.bio}>{bioSnippet}</p>}

      {expertiseTags.length > 0 && (
        <div className={styles.tagRow}>
          {expertiseTags.map((tag) => (
            <span key={tag} className={styles.expertiseTag}>{tag}</span>
          ))}
          {(mentor.expertise_areas || []).length > 4 && (
            <span className={styles.moreTag}>+{mentor.expertise_areas.length - 4} more</span>
          )}
        </div>
      )}

      <div className={styles.sessionRow}>
        {mentor.session_types.map((st) => (
          <span key={st.id} className={styles.sessionChip}>
            {SESSION_TYPE_LABELS[st.session_type] || st.session_type}
            <span className={styles.chipDuration}>{st.duration_minutes}m</span>
          </span>
        ))}
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.footerStats}>
          {hasRating ? (
            <StarRating value={mentor.avg_rating} />
          ) : (
            <span className={styles.newMentor}>New mentor</span>
          )}
          <span className={styles.sessions}>
            {mentor.total_sessions || 0} session{mentor.total_sessions !== 1 ? 's' : ''}
          </span>
        </div>
        <div className={styles.cardActions}>
          <Link className={styles.profileBtn} href={`/student/mentors/${mentor.id}`}>
            View Profile
          </Link>
          <button className={styles.bookBtn} onClick={() => onBook(mentor)}>
            Book Session
          </button>
        </div>
      </div>
    </article>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BrowseMentorsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mentors, setMentors] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [token, setToken] = useState('')
  const [bookingTarget, setBookingTarget] = useState(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setToken(session.access_token)

      const res = await fetch('/api/student/mentors', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Failed to load mentors.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setMentors(data.mentors || [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return mentors
    return mentors.filter((m) =>
      m.session_types.some((st) => st.session_type === activeFilter)
    )
  }, [mentors, activeFilter])

  const availableFilters = useMemo(() => {
    const present = new Set(
      mentors.flatMap((m) => m.session_types.map((st) => st.session_type))
    )
    return SESSION_FILTERS.filter((f) => f.key === 'all' || present.has(f.key))
  }, [mentors])

  function handleBook(mentor) {
    setBookingTarget(mentor)
    setBookingSuccess(false)
  }

  function handleModalClose() {
    setBookingTarget(null)
    setBookingSuccess(false)
  }

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
        <p className={styles.badge}>Mentors</p>
        <h1>Find a Mentor</h1>
        <p className={styles.subtitle}>
          Browse approved mentors and book a session directly from their profile.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!error && (
        <>
          <div className={styles.filterRow}>
            {availableFilters.map((f) => (
              <button
                key={f.key}
                className={`${styles.filterBtn} ${activeFilter === f.key ? styles.filterActive : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              {mentors.length === 0 ? (
                <p>No mentors are available yet. Check back soon.</p>
              ) : (
                <p>No mentors offer this session type right now.</p>
              )}
            </div>
          ) : (
            <>
              <p className={styles.resultCount}>
                {filtered.length} mentor{filtered.length !== 1 ? 's' : ''} available
              </p>
              <div className={styles.grid}>
                {filtered.map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} onBook={handleBook} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {bookingTarget && !bookingSuccess && (
        <BookingModal
          mentor={bookingTarget}
          token={token}
          onClose={handleModalClose}
          onSuccess={() => setBookingSuccess(true)}
        />
      )}

      {bookingTarget && bookingSuccess && (
        <BookingSuccess
          mentor={bookingTarget}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
