'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useStudentUser } from '../user-context'
import styles from './page.module.css'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PK', { dateStyle: 'medium' })
}

function VouchCard({ vouch }) {
  return (
    <article className={styles.vouchCard}>
      <div className={styles.vouchHead}>
        <div>
          <p className={styles.mentorName}>{vouch.mentor_name}</p>
          <p className={styles.vouchDate}>{formatDate(vouch.created_at)}</p>
        </div>
        {vouch.vouch_status === 'verified' && (
          <span className={styles.verifiedBadge}>✓ Verified</span>
        )}
      </div>
      <blockquote className={styles.vouchText}>&ldquo;{vouch.vouch_text}&rdquo;</blockquote>
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

export default function StudentProfilePage() {
  const user = useStudentUser()
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [vouches, setVouches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }

      const [statsRes, vouchesRes] = await Promise.all([
        fetch('/api/student/profile', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch('/api/student/sifarish', { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ])

      if (statsRes.ok) {
        const d = await statsRes.json()
        setStats(d.stats)
      }
      if (vouchesRes.ok) {
        const d = await vouchesRes.json()
        setVouches(d.vouches || [])
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className={styles.loadingWrap}><span className={styles.spinner} /></div>
  }

  const initials = (user?.full_name || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className={styles.page}>
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.identity}>
          <h1>{user?.full_name || 'Student'}</h1>
          <p className={styles.email}>{user?.email}</p>
          <span className={styles.roleBadge}>Student</span>
        </div>
      </div>

      {stats && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.completed_sessions}</p>
            <p className={styles.statLabel}>Sessions Completed</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.active_sessions}</p>
            <p className={styles.statLabel}>Active Sessions</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.sifarish_count}</p>
            <p className={styles.statLabel}>Sifarish Vouches</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{stats.pending_action_items}</p>
            <p className={styles.statLabel}>Open Action Items</p>
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Sifarish Vouches
          {vouches.length > 0 && <span className={styles.sectionCount}>{vouches.length}</span>}
        </h2>

        {vouches.length === 0 ? (
          <div className={styles.empty}>
            <p>No vouches yet. Complete sessions with mentors to collect Sifarish.</p>
          </div>
        ) : (
          <div className={styles.vouchesList}>
            {vouches.map((v) => <VouchCard key={v.id} vouch={v} />)}
          </div>
        )}
      </section>
    </div>
  )
}
