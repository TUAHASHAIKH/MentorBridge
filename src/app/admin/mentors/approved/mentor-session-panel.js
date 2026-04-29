'use client'

import { useState } from 'react'
import styles from './page.module.css'

const SESSION_TYPE_LABELS = {
  mock_interview: 'Mock Interview',
  cv_review: 'CV Review',
  career_guidance: 'Career Guidance',
  project_mentorship: 'Project Mentorship',
  accountability_checkin: 'Accountability Check-in',
}

function getInitialStatus(mentorApprovedSessionTypes) {
  if (!mentorApprovedSessionTypes || mentorApprovedSessionTypes.length === 0) return 'pending'
  return mentorApprovedSessionTypes[0].is_approved ? 'approved' : 'restricted'
}

export default function MentorSessionPanel({ mentor }) {
  const profile = mentor.profiles || {}
  const sessionTypes = mentor.mentor_session_types || []

  const [statuses, setStatuses] = useState(() => {
    const map = {}
    sessionTypes.forEach((st) => {
      map[st.id] = getInitialStatus(st.mentor_approved_session_types)
    })
    return map
  })

  const [loading, setLoading] = useState({})
  const [panelError, setPanelError] = useState('')
  const [restrictReason, setRestrictReason] = useState({})
  const [showRestrictInput, setShowRestrictInput] = useState({})

  async function handleAction(sessionTypeId, action, reason) {
    setLoading((prev) => ({ ...prev, [sessionTypeId]: true }))
    setPanelError('')

    const res = await fetch(`/api/admin/mentors/session-types/${mentor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionTypeId, reason }),
    })

    setLoading((prev) => ({ ...prev, [sessionTypeId]: false }))

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setPanelError(d.error || 'Action failed.')
      return
    }

    setStatuses((prev) => ({ ...prev, [sessionTypeId]: action === 'approve' ? 'approved' : 'restricted' }))
    setShowRestrictInput((prev) => ({ ...prev, [sessionTypeId]: false }))
    setRestrictReason((prev) => ({ ...prev, [sessionTypeId]: '' }))
  }

  if (sessionTypes.length === 0) {
    return (
      <article className={styles.mentorCard}>
        <div className={styles.mentorHeader}>
          <div>
            <h3>{profile.full_name || 'Unnamed Mentor'}</h3>
            <p>{profile.email}</p>
            {mentor.department && <p className={styles.dept}>{mentor.department}</p>}
          </div>
          <span className={styles.noTypes}>No session types added yet</span>
        </div>
      </article>
    )
  }

  return (
    <article className={styles.mentorCard}>
      <div className={styles.mentorHeader}>
        <div>
          <h3>{profile.full_name || 'Unnamed Mentor'}</h3>
          <p>{profile.email}</p>
          {mentor.department && <p className={styles.dept}>{mentor.department}</p>}
        </div>
        <span className={styles.sessionCount}>
          {sessionTypes.length} session type{sessionTypes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {panelError && <p className={styles.errorMsg}>{panelError}</p>}

      <div className={styles.sessionTypes}>
        {sessionTypes.map((st) => {
          const status = statuses[st.id]
          const isLoading = loading[st.id]
          const showRestrict = showRestrictInput[st.id]

          return (
            <div key={st.id} className={styles.sessionTypeRow}>
              <div className={styles.sessionTypeInfo}>
                <span className={styles.sessionTypeName}>
                  {SESSION_TYPE_LABELS[st.session_type] || st.session_type}
                </span>
                <span className={styles.sessionTypeDuration}>{st.duration_minutes} min</span>
              </div>

              <div className={styles.sessionTypeActions}>
                <span className={`${styles.statusBadge} ${styles[status]}`}>{status}</span>

                {!showRestrict && (
                  <>
                    {status !== 'approved' && (
                      <button
                        className={styles.approveBtn}
                        disabled={isLoading}
                        onClick={() => handleAction(st.id, 'approve')}
                      >
                        {isLoading ? '...' : 'Approve'}
                      </button>
                    )}
                    {status !== 'restricted' && (
                      <button
                        className={styles.restrictBtn}
                        disabled={isLoading}
                        onClick={() =>
                          setShowRestrictInput((prev) => ({ ...prev, [st.id]: true }))
                        }
                      >
                        Restrict
                      </button>
                    )}
                  </>
                )}

                {showRestrict && (
                  <div className={styles.restrictForm}>
                    <input
                      type="text"
                      placeholder="Reason for restriction (required)"
                      value={restrictReason[st.id] || ''}
                      onChange={(e) =>
                        setRestrictReason((prev) => ({ ...prev, [st.id]: e.target.value }))
                      }
                    />
                    <button
                      className={styles.restrictBtn}
                      disabled={isLoading || !restrictReason[st.id]?.trim()}
                      onClick={() => handleAction(st.id, 'restrict', restrictReason[st.id])}
                    >
                      {isLoading ? '...' : 'Confirm'}
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() =>
                        setShowRestrictInput((prev) => ({ ...prev, [st.id]: false }))
                      }
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
