'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PK', { dateStyle: 'medium' })
}

function VouchCard({ vouch }) {
  const isVerified = vouch.vouch_status === 'verified'

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <p className={styles.mentorName}>{vouch.mentor_name}</p>
          <p className={styles.date}>{formatDate(vouch.created_at)}</p>
        </div>
        {isVerified && (
          <span className={styles.verifiedBadge}>✓ Verified</span>
        )}
      </div>

      <blockquote className={styles.vouchText}>
        &ldquo;{vouch.vouch_text}&rdquo;
      </blockquote>

      {vouch.skills_endorsed?.length > 0 && (
        <div className={styles.skillsRow}>
          {vouch.skills_endorsed.map((skill, i) => (
            <span key={i} className={styles.skillTag}>{skill}</span>
          ))}
        </div>
      )}
    </article>
  )
}

export default function StudentSifarishPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vouches, setVouches] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/student/sifarish', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Failed to load vouches.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setVouches(data.vouches || [])
      setLoading(false)
    })
  }, [])

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
        <p className={styles.pageBadge}>Sifarish</p>
        <h1>My Vouches</h1>
        <p className={styles.subtitle}>
          Endorsements written by your mentors after completed sessions. Verified vouches carry extra weight.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!error && vouches.length === 0 && (
        <div className={styles.empty}>
          <p>No Sifarish vouches yet.</p>
          <p className={styles.emptyHint}>
            Complete a session and ask your mentor to write you a Sifarish from their <strong>My Sessions</strong> page.
          </p>
        </div>
      )}

      {!error && vouches.length > 0 && (
        <>
          <p className={styles.count}>
            {vouches.length} vouch{vouches.length !== 1 ? 'es' : ''}
            {vouches.filter((v) => v.vouch_status === 'verified').length > 0 && (
              <span className={styles.verifiedCount}>
                {' '}· {vouches.filter((v) => v.vouch_status === 'verified').length} verified
              </span>
            )}
          </p>
          <div className={styles.list}>
            {vouches.map((v) => (
              <VouchCard key={v.id} vouch={v} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
