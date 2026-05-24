import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import RouteTracker from './components/RouteTracker'
import ServerErrorBanner from './components/ServerErrorBanner'

// Eagerly loaded — these are on the landing-page path or in the nav.
import Home from './pages/Home'
import RoutesPage from './pages/Routes'
import Schedule from './pages/Schedule'
import Login from './pages/Login'
import Register from './pages/Register'

// Lazy-loaded — visitors who never reach booking, the admin pages, or a
// permanent-ticket URL shouldn't pay for the code those pages drag in.
const Booking = lazy(() => import('./pages/Booking'))
const BookingSuccess = lazy(() => import('./pages/BookingSuccess'))
const Ticket = lazy(() => import('./pages/Ticket'))
const Profile = lazy(() => import('./pages/Profile'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Admin = lazy(() => import('./pages/Admin'))
const Analytics = lazy(() => import('./pages/Analytics'))

function PageFallback() {
  return <div style={{ padding: '60px 2rem', textAlign: 'center', color: 'var(--text2)' }}>Завантаження...</div>
}

function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <Navbar />
      <ServerErrorBanner />
      <main>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/booking/success" element={<BookingSuccess />} />
            <Route path="/ticket/:code" element={<Ticket />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><Analytics /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </BrowserRouter>
  )
}

export default App
