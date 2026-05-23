import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
