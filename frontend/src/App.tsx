import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Dashboard from './pages/dashboard/Dashboard.tsx'
import Analytics from './pages/analytics/Analytics.tsx'
import Accounts from './pages/accounts/Accounts.tsx'
import Publish from './pages/publish/Publish.tsx'
import Calendar from './pages/calendar/Calendar.tsx'
import Inbox from './pages/inbox/Inbox.tsx'
import Auth from './pages/auth/Auth.tsx'
import ResetPassword from './pages/auth/ResetPassword.tsx'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes – no auth required */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />

        {/* Protected routes – redirect to /auth if not logged in */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="publish" element={<Publish />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="engagement" element={<Inbox />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
