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

const FILTERS = ['all', 'pending', 'in_progress', 'completed', 'overdue']

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PK', { dateStyle: 'medium' })
}

function ItemCard({ item, token, onStatusChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const effectiveStatus = item.is_overdue ? 'overdue' : item.status

  async function updateStatus(newStatus) {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/student/action-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error || 'Failed to update.'); return }
    onStatusChange(item.id, newStatus)
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardLeft}>
          <p className={styles.itemTitle}>{item.title}</p>
          {item.description && <p className={styles.itemDesc}>{item.description}</p>}
          <p className={styles.sessionMeta}>
            {SESSION_TYPE_LABELS[item.session_type] || item.session_type} · {item.mentor_name}
          </p>
        </div>
        <div className={styles.cardRight}>
          <span className={`${styles.statusBadge} ${styles['status_' + effectiveStatus]}`}>
            {effectiveStatus.replace('_', ' ')}
          </span>
          {item.due_date && (
            <span className={`${styles.dueDate} ${item.is_overdue ? styles.dueDateOverdue : ''}`}>
              Due {formatDate(item.due_date)}
            </span>
          )}
        </div>
      </div>

      {error && <p className={styles.itemError}>{error}</p>}

      {item.status !== 'completed' && (
        <div className={styles.itemActions}>
          {item.status === 'pending' && (
            <button
              className={styles.startBtn}
              disabled={busy}
              onClick={() => updateStatus('in_progress')}
            >
              {busy ? '…' : 'Start'}
            </button>
          )}
          <button
            className={styles.completeBtn}
            disabled={busy}
            onClick={() => updateStatus('completed')}
          >
            {busy ? '…' : 'Mark Complete'}
          </button>
        </div>
      )}
    </article>
  )
}

export default function StudentActionItemsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [token, setToken] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setToken(session.access_token)

      const res = await fetch('/api/student/action-items', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Failed to load action items.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setItems(data.items || [])
      setLoading(false)
    })
  }, [])

  function handleStatusChange(itemId, newStatus) {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: newStatus, is_overdue: false } : i))
    )
  }

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return items
    if (activeFilter === 'overdue') return items.filter((i) => i.is_overdue)
    return items.filter((i) => i.status === activeFilter && !i.is_overdue)
  }, [items, activeFilter])

  const counts = useMemo(() => {
    const c = {
      all: items.length,
      overdue: items.filter((i) => i.is_overdue).length,
    }
    items.forEach((i) => {
      if (!i.is_overdue) c[i.status] = (c[i.status] || 0) + 1
    })
    return c
  }, [items])

  if (loading) {
    return <div className={styles.loadingWrap}><span className={styles.spinner} /></div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.pageBadge}>Action Items</p>
        <h1>My Action Items</h1>
        <p className={styles.subtitle}>
          Tasks assigned by your mentors after completed sessions. Track your progress here.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!error && (
        <>
          <div className={styles.filterRow}>
            {FILTERS.map((f) =>
              counts[f] !== undefined || f === 'all' ? (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${activeFilter === f ? styles.filterActive : ''} ${f === 'overdue' && counts.overdue > 0 ? styles.filterOverdue : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                  {counts[f] ? <span className={styles.filterCount}>{counts[f]}</span> : null}
                </button>
              ) : null
            )}
          </div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>
                {items.length === 0
                  ? 'No action items yet. They will appear here after mentors assign tasks.'
                  : `No ${activeFilter === 'in_progress' ? 'in-progress' : activeFilter} items.`}
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} token={token} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
