import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppShell from '../ui/AppShell'

export default function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <AppShell>
        <main className="page-container flex items-center justify-center min-h-[50vh]">
          <p className="text-fg-muted">Loading...</p>
        </main>
      </AppShell>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return <Navigate to="/markets" replace />
  }

  return children
}
