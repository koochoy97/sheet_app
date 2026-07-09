import React from 'react'
import Sheet from './components/Sheet.jsx'
import Login from './components/Login.jsx'
import { Button } from './components/ui/button'
import { auth } from './firebase.js'
import {
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'

const ALLOWED_DOMAIN = 'wearesiete.com'
const isAllowedEmail = (email) =>
  typeof email === 'string' && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)

export default function App() {
  const [authenticated, setAuthenticated] = React.useState(false)
  const [user, setUser] = React.useState(null)
  const [loginPending, setLoginPending] = React.useState(false)
  const [loginError, setLoginError] = React.useState('')
  const [initializing, setInitializing] = React.useState(true)

  React.useEffect(() => {
    let unsubscribe = () => {}
    const init = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence)
      } catch (err) {
        console.warn('[Auth] persistence setup failed', err)
      }
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && !isAllowedEmail(user.email)) {
          // Persisted session from a non-Siete account: reject and sign out.
          signOut(auth).catch(() => {})
          setAuthenticated(false)
          setUser(null)
          setLoginError(`Solo cuentas @${ALLOWED_DOMAIN} tienen acceso.`)
          setInitializing(false)
          return
        }
        setUser(user)
        setAuthenticated(Boolean(user))
        setInitializing(false)
      })
    }
    init()
    return () => {
      unsubscribe()
    }
  }, [])

  const handleLogin = React.useCallback(async () => {
    try {
      setLoginError('')
      setLoginPending(true)
      const provider = new GoogleAuthProvider()
      // Hint Google's account chooser toward the Siete Workspace.
      provider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: 'select_account' })
      const { user } = await signInWithPopup(auth, provider)
      if (!isAllowedEmail(user?.email)) {
        await signOut(auth)
        setAuthenticated(false)
        setLoginError(`Solo cuentas @${ALLOWED_DOMAIN} tienen acceso.`)
        return
      }
      setAuthenticated(true)
    } catch (err) {
      console.warn('[Login] error', err)
      const code = err?.code ?? ''
      switch (code) {
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
          setLoginError('')
          break
        case 'auth/popup-blocked':
          setLoginError('El navegador bloqueó la ventana. Habilita los pop-ups e intenta de nuevo.')
          break
        default:
          setLoginError('No se pudo iniciar sesión con Google. Intenta nuevamente.')
          break
      }
    } finally {
      setLoginPending(false)
    }
  }, [])

  if (initializing) {
    return (
      <div className="app login-app">
        <div className="login-page">
          <p className="login-subtitle">Cargando sesión…</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="app login-app">
        <Login onSubmit={handleLogin} submitting={loginPending} error={loginError} />
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (err) {
      console.warn('[Logout] error', err)
    } finally {
      setAuthenticated(false)
      setUser(null)
      setLoginError('')
    }
  }

  const displayName =
    user?.displayName?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    ''

  return (
    <div className="app">
      <div className="sheet-container">
        <div className="sheet-heading-row">
          <h1 className="sheet-heading">Registro de reuniones obtenidas</h1>
          <div className="header-user">
            {displayName && <span className="header-greeting">Hola {displayName}</span>}
            <Button
              variant="outline"
              className="logout-button"
              onClick={handleLogout}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
        <Sheet currentUserEmail={user?.email || ''} />
      </div>
    </div>
  )
}
