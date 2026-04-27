import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import {
  ADMIN_SESSION_COOKIE,
  deleteAdminSessionByToken,
  validateAdminSession,
} from '@/lib/admin-session'
import CreateAdminForm from './create-admin-form'

import styles from './page.module.css'

async function logout() {
  'use server'

  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  await deleteAdminSessionByToken(token)
  cookieStore.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  redirect('/admin/login')
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const session = await validateAdminSession(sessionToken, { touch: true })

  if (!session.valid) {
    redirect('/admin/login')
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.badge}>Secure Admin Portal</p>
        <h1>Welcome, {session.user.fullName || 'Admin'}.</h1>
        <p>
          You are signed in as {session.user.email}. This route is isolated from student and mentor
          auth flows.
        </p>

        <CreateAdminForm />

        <div className={styles.actions}>
          <Link href="/" className={styles.link}>
            Back to Home
          </Link>
          <form action={logout}>
            <button type="submit" className={styles.button}>
              Log out
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
