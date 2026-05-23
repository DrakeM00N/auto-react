import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Renders an "or" divider and Google's Sign-in button.
// Used on both the Login and Register pages — Google sign-in and
// sign-up are the same find-or-create flow on the backend.
function GoogleAuthButton({ onError }) {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  // Don't render anything if Google OAuth wasn't configured — the button
  // would silently fail on click otherwise.
  if (!GOOGLE_CLIENT_ID) return null

  const handleSuccess = async (credentialResponse) => {
    const result = await loginWithGoogle(credentialResponse.credential)
    if (!result.success) {
      onError?.(result.message)
      return
    }
    navigate('/')
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text2)' }}>
        <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '0.9rem' }}>або</span>
        <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => onError?.('Не вдалося увійти через Google')}
          text="continue_with"
          shape="pill"
          locale="uk"
        />
      </div>
    </div>
  )
}

export default GoogleAuthButton
