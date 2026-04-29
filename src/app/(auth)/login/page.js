import { Suspense } from 'react'
import LoginForm from './login-form'
import styles from './page.module.css'

export const metadata = {
  title: 'Sign In | MentorBridge',
}

function LoadingFallback() {
  return (
    <div className={styles.checking}>
      <span className={styles.spinner} />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  )
}
