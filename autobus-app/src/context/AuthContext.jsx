import { createContext, useContext, useState } from 'react'
import { apiRequest as request } from '../lib/api'

const AuthContext = createContext(null)

function persistUser(user) {
  if (user) localStorage.setItem('app-current-user', JSON.stringify(user))
  else localStorage.removeItem('app-current-user')
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('app-current-user')
    try { return saved ? JSON.parse(saved) : null } catch { return null }
  })

  const wrap = async (fn) => {
    try {
      return await fn()
    } catch (e) {
      return { success: false, message: e.message }
    }
  }

  const acceptToken = ({ token, user }) => {
    localStorage.setItem('token', token)
    persistUser(user)
    setCurrentUser(user)
    return { success: true }
  }

  const register = (name, email, password) => wrap(async () => {
    const data = await request('POST', '/auth/register', { name, email, password })
    return acceptToken(data)
  })

  const login = (email, password) => wrap(async () => {
    const data = await request('POST', '/auth/login', { email, password })
    return acceptToken(data)
  })

  const loginWithGoogle = (credential) => wrap(async () => {
    const data = await request('POST', '/auth/google', { credential })
    return acceptToken(data)
  })

  const logout = () => {
    localStorage.removeItem('token')
    persistUser(null)
    setCurrentUser(null)
  }

  const changePassword = (currentPassword, newPassword) => wrap(async () => {
    await request('POST', '/auth/change-password', { currentPassword, newPassword })
    return { success: true }
  })

  const resetPassword = (email, newPassword, token) => wrap(async () => {
    await request('POST', '/auth/reset-password', { email, newPassword, token })
    return { success: true }
  })

  return (
    <AuthContext.Provider value={{
      currentUser,
      register, login, loginWithGoogle, logout,
      changePassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
