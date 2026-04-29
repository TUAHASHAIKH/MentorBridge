'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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

const YEAR_OPTIONS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Graduate Student',
  'Alumni',
]

function StatusScreen({ application, onReapply }) {
  const isPending = application.status === 'pending'
  const isRejected = application.status === 'rejected'

  return (
    <div className={styles.statusWrap}>
      <div className={`${styles.statusCard} ${isRejected ? styles.rejected : styles.pending}`}>
        <span className={styles.statusIcon}>{isPending ? '⏳' : '✕'}</span>
        <h2>{isPending ? 'Application Under Review' : 'Application Not Approved'}</h2>

        {isPending && (
          <p>
            Your mentor application has been submitted and is being reviewed by the admin team.
            You will be notified once a decision is made.
          </p>
        )}

        {isRejected && (
          <>
            <p>Your previous application was not approved.</p>
            {application.rejection_reason && (
              <div className={styles.rejectionReason}>
                <p className={styles.rejectionLabel}>Reason given:</p>
                <p>{application.rejection_reason}</p>
              </div>
            )}
            <button onClick={onReapply} className={styles.reapplyBtn}>
              Submit New Application
            </button>
          </>
        )}

        <Link href="/student" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default function ApplyMentorPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [existingApplication, setExistingApplication] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [token, setToken] = useState('')

  // Form state
  const [applicationBio, setApplicationBio] = useState('')
  const [department, setDepartment] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [yearsOfExperience, setYearsOfExperience] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [expertiseInput, setExpertiseInput] = useState('')
  const [qualifications, setQualifications] = useState([''])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setToken(session.access_token)

      const res = await fetch('/api/student/apply-mentor', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        const data = await res.json()
        if (data.application) {
          setExistingApplication(data.application)
        } else {
          setShowForm(true)
        }
      }

      setLoading(false)
    })
  }, [])

  function addQualification() {
    setQualifications((prev) => [...prev, ''])
  }

  function updateQualification(index, value) {
    setQualifications((prev) => prev.map((q, i) => (i === index ? value : q)))
  }

  function removeQualification(index) {
    setQualifications((prev) => prev.filter((_, i) => i !== index))
  }

  function parseExpertise(raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const expertise = parseExpertise(expertiseInput)
    if (!expertise.length) {
      setError('Enter at least one expertise area.')
      return
    }

    setSubmitting(true)

    const res = await fetch('/api/student/apply-mentor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        application_bio: applicationBio,
        department,
        year_of_study: yearOfStudy,
        years_of_experience: Number(yearsOfExperience) || 0,
        expertise_areas: expertise,
        linkedin_url: linkedinUrl,
        application_qualifications: qualifications.filter((q) => q.trim()),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Submission failed. Please try again.')
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} />
      </div>
    )
  }

  if (success) {
    return (
      <div className={styles.statusWrap}>
        <div className={`${styles.statusCard} ${styles.pending}`}>
          <span className={styles.statusIcon}>✓</span>
          <h2>Application Submitted</h2>
          <p>
            Your mentor application is now pending review. The admin team will review it and get
            back to you.
          </p>
          <Link href="/student" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (existingApplication && !showForm) {
    return (
      <StatusScreen
        application={existingApplication}
        onReapply={() => {
          setShowForm(true)
          setExistingApplication(null)
        }}
      />
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Link href="/student" className={styles.backLink}>
          ← Dashboard
        </Link>
        <p className={styles.badge}>Mentor Application</p>
        <h1>Apply to Become a Mentor</h1>
        <p className={styles.subtitle}>
          Share your background and what you can offer. Your application will be reviewed by the
          admin team before you are approved.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>

        {/* Section 1: About You */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Why do you want to mentor?</h2>
          <p className={styles.sectionHint}>
            Tell students what you have been through, what you learned, and how you can help.
          </p>

          <label htmlFor="bio">Application Bio <span className={styles.required}>*</span></label>
          <textarea
            id="bio"
            value={applicationBio}
            onChange={(e) => setApplicationBio(e.target.value)}
            placeholder="I'm a final-year CS student who went through multiple internship cycles and can help juniors navigate mock interviews, CV writing, and career decisions..."
            rows={5}
            required
          />
        </section>

        {/* Section 2: Academic Background */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Academic Background</h2>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="department">Department / Field <span className={styles.required}>*</span></label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Computer Science, BBA, Electrical Engineering"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="year">Year of Study</label>
              <select
                id="year"
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
              >
                <option value="">Select year</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: Experience */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Experience &amp; Expertise</h2>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="experience">Years of Relevant Experience</label>
              <input
                id="experience"
                type="number"
                min="0"
                max="20"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                placeholder="e.g., 2"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="linkedin">LinkedIn URL</label>
              <input
                id="linkedin"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/your-profile"
              />
            </div>
          </div>

          <label htmlFor="expertise">
            Expertise Areas <span className={styles.required}>*</span>
            <span className={styles.fieldHint}> — comma separated</span>
          </label>
          <input
            id="expertise"
            type="text"
            value={expertiseInput}
            onChange={(e) => setExpertiseInput(e.target.value)}
            placeholder="e.g., React, System Design, CV Writing, Data Structures"
          />

          {expertiseInput && (
            <div className={styles.expertiseTags}>
              {parseExpertise(expertiseInput).map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </section>

        {/* Section 4: Qualifications */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Qualifications &amp; Achievements</h2>
          <p className={styles.sectionHint}>
            Add internships, projects, certifications, or anything that demonstrates you can help
            students. Each line is one item.
          </p>

          <div className={styles.qualList}>
            {qualifications.map((q, i) => (
              <div key={i} className={styles.qualRow}>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => updateQualification(i, e.target.value)}
                  placeholder={`e.g., Software intern at XYZ, 2024`}
                />
                {qualifications.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeQualification(i)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className={styles.addBtn} onClick={addQualification}>
              + Add another
            </button>
          </div>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
          <Link href="/student" className={styles.cancelLink}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
