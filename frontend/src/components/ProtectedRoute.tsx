import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  // Still determining auth state — show a simple centered spinner
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0a0f',
          color: '#888',
          fontSize: '1rem',
        }}
      >
        Loading…
      </div>
    )
  }

  // Not authenticated → redirect to login
  if (!session) {
    return <Navigate to="/auth" replace />
  }

  // Authenticated → render child routes
  return <Outlet />
}
