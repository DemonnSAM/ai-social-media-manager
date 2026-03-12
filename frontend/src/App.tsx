import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/dashboard/Dashboard.tsx'
import Analytics from './pages/analytics/Analytics.tsx'
import Accounts from './pages/accounts/Accounts.tsx'
import Publish from './pages/publish/Publish.tsx'
import Calendar from './pages/calendar/Calendar.tsx'
import Inbox from './pages/inbox/Inbox.tsx'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="publish" element={<Publish />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="engagement" element={<Inbox />} />
      </Route>
    </Routes>
  )
}

export default App
