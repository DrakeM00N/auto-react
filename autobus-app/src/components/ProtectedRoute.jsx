import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { currentUser } = useApp()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
