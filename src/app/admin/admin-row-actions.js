'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import styles from './admin-row-actions.module.css'

async function submitAction({ endpoint, action, payload, requiresReason, confirmMessage, reasonPrompt }) {
  if (confirmMessage && !window.confirm(confirmMessage)) {
    return { ok: false, skipped: true }
  }

  const requestBody = { action, ...payload }

  if (requiresReason) {
    const reason = window.prompt(reasonPrompt || 'Enter a reason')
    const trimmedReason = String(reason || '').trim()

    if (!trimmedReason) {
      return { ok: false, skipped: true }
    }

    requestBody.reason = trimmedReason
    requestBody.rejectionReason = trimmedReason
    requestBody.description = trimmedReason
  }

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Action failed.')
  }

  return data
}

export default function AdminRowActions({ endpoint, actions = [] }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [activeAction, setActiveAction] = useState('')

  async function handleClick(actionConfig) {
    setActiveAction(actionConfig.action)
    setMessage('')

    try {
      await submitAction(actionConfig)
      setMessage(actionConfig.successMessage || 'Saved.')
      router.refresh()
    } catch (error) {
      setMessage(error.message || 'Action failed.')
    } finally {
      setActiveAction('')
    }
  }

  if (actions.length === 0) {
    return null
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.buttons}>
        {actions.map((actionConfig) => (
          <button
            key={actionConfig.action}
            type="button"
            className={`${styles.button} ${styles[actionConfig.variant] || ''}`}
            disabled={activeAction === actionConfig.action}
            onClick={() => handleClick({ endpoint, ...actionConfig })}
          >
            {activeAction === actionConfig.action ? 'Working...' : actionConfig.label}
          </button>
        ))}
      </div>
      {message ? <p className={styles.message}>{message}</p> : null}
    </div>
  )
}
