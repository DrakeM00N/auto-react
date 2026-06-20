import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { DataProvider } from './context/DataContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { HelmetProvider } from 'react-helmet-async'

// Check if we have server-rendered data in window
const initialData = window.__INITIAL_DATA__ || null

const root = hydrateRoot(document.getElementById('root'), (
  <HelmetProvider>
    <AuthProvider>
      <DataProvider initialData={initialData}>
        <ThemeProvider>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </GoogleOAuthProvider>
        </ThemeProvider>
      </DataProvider>
    </AuthProvider>
  </HelmetProvider>
))