'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

const STATUS_COLORS = {
  active: 'statusActive',
  verified: 'statusVerified',
  flagged: 'statusFlagged',
  revoked: 'statusRevoked',
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PK', { dateStyle: 'medium' })
}

function VouchCard({ vouch }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <p className={styles.studentName}>{vouch.student_name}</p>
          {vouch.student_email && (
            <p className={styles.studentEmail}>{vouch.student_email}</p>
          )}
        </div>
        <div className={styles.cardMeta}>
          <span className={`${styles.statusBadge} ${styles[STATUS_COLORS[vouch.vouch_status]] || ''}`}>
            {vouch.vouch_status}
          </span>
          <span className={styles.date}>{formatDate(vouch.created_at)}</span>
        </div>
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

      <p className={styles.visibility}>
        {vouch.is_public ? 'Public on student profile' : 'Private'}
      </p>
    </article>
  )
}

export default function MentorSifarishPage() {
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

      const res = await fetch('/api/mentor/sifarish', {
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
        <h1>Written Vouches</h1>
        <p className={styles.subtitle}>
          Vouches you have written for students after completed sessions. Head to{' '}
          <strong>My Sessions</strong> to write a new one.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!error && vouches.length === 0 && (
        <div className={styles.empty}>
          <p>You have not written any Sifarish vouches yet.</p>
          <p className={styles.emptyHint}>
            After marking a session complete, use the <strong>Write Sifarish</strong> button on that session card.
          </p>
        </div>
      )}

      {!error && vouches.length > 0 && (
        <>
          <p className={styles.count}>{vouches.length} vouch{vouches.length !== 1 ? 'es' : ''} written</p>
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
