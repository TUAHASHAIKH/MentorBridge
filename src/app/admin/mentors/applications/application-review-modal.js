'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import styles from './application-review-modal.module.css'

function formatArray(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return 'Not provided'
  }

  return value.join(', ')
}

function formatQualifications(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return 'Not provided'
  }

  return value
    .map((item) => {
      if (!item) {
        return null
      }

      if (typeof item === 'string') {
        return item
      }

      if (typeof item === 'object' && item.title) {
        return item.title
      }

      return JSON.stringify(item)
    })
    .filter(Boolean)
    .join(', ')
}

export default function ApplicationReviewModal({ application }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [message, setMessage] = useState('')

  const profile = application?.profiles || {}
  const submittedAt = application.created_at ? new Date(application.created_at).toLocaleString() : 'Unknown'

  async function submitReview(action) {
    if (action === 'reject' && !rejectionReason.trim()) {
      setMessage('Rejection reason is required.')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch(`/api/admin/mentors/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          rejectionReason: rejectionReason.trim() || undefined,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Could not process application.')
      }

      setMessage(action === 'approve' ? 'Application approved.' : 'Application rejected.')
      setIsOpen(false)
      router.refresh()
    } catch (error) {
      setMessage(error.message || 'Could not process application.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button type="button" className={styles.reviewButton} onClick={() => setIsOpen(true)}>
        Review
      </button>

      {message ? <p className={styles.inlineMessage}>{message}</p> : null}

      {isOpen ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Mentor application review" onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div className={styles.identity}>
                <span className={styles.statusPill}>{application.status || 'pending'}</span>
                <h2>{profile.full_name || 'Unnamed applicant'}</h2>
                <p>{profile.email || 'No email provided'}</p>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Close
              </button>
            </header>

            <section className={styles.grid}>
              <article>
                <h3>Profile</h3>
                <p><strong>University Email:</strong> {profile.university_email || 'Not provided'}</p>
                <p><strong>Department:</strong> {application.department || 'Not provided'}</p>
                <p><strong>Year of Study:</strong> {application.year_of_study || 'Not provided'}</p>
                <p><strong>Experience:</strong> {application.years_of_experience || 0} years</p>
                <p>
                  <strong>LinkedIn:</strong>{' '}
                  {application.linkedin_url ? (
                    <a href={application.linkedin_url} target="_blank" rel="noreferrer" className={styles.linkValue}>
                      Open profile
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </p>
              </article>

              <article>
                <h3>Application Details</h3>
                <p><strong>Application Bio:</strong> {application.application_bio || application.bio || 'Not provided'}</p>
                <p><strong>Expertise Areas:</strong> {formatArray(application.expertise_areas)}</p>
                <p><strong>Qualifications:</strong> {formatQualifications(application.application_qualifications)}</p>
                <p><strong>Submitted:</strong> {submittedAt}</p>
              </article>
            </section>

            <section className={styles.rejectionSection}>
              <label htmlFor={`rejection-${application.id}`}>Rejection reason (required only if rejecting)</label>
              <textarea
                id={`rejection-${application.id}`}
                className={styles.textarea}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={3}
                placeholder="Write why this application is being rejected"
              />
            </section>

            <footer className={styles.actions}>
              <button type="button" className={styles.approveButton} disabled={isSubmitting} onClick={() => submitReview('approve')}>
                {isSubmitting ? 'Working...' : 'Approve'}
              </button>
              <button type="button" className={styles.rejectButton} disabled={isSubmitting} onClick={() => submitReview('reject')}>
                {isSubmitting ? 'Working...' : 'Reject'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  )
}
