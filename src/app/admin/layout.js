import AdminShell from './admin-shell'

export const metadata = {
  title: 'Admin | MentorBridge',
}

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>
}
