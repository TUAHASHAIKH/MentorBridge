'use client'

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

function MentorCard({ mentor }) {
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
        {hasRating ? (
          <StarRating value={mentor.avg_rating} />
        ) : (
          <span className={styles.newMentor}>New mentor</span>
        )}
        <span className={styles.sessions}>
          {mentor.total_sessions || 0} session{mentor.total_sessions !== 1 ? 's' : ''}
        </span>
      </div>
    </article>
  )
}

export default function BrowseMentorsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mentors, setMentors] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

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
          Browse approved mentors and see what session types they offer.
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
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
