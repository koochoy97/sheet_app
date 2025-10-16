import React from 'react'
import Sheet from './components/Sheet.jsx'
import Login from './components/Login.jsx'
import { Button } from './components/ui/button'
import { auth } from './firebase.js'
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'

export default function App() {
  const [authenticated, setAuthenticated] = React.useState(false)
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
        setAuthenticated(Boolean(user))
        setInitializing(false)
      })
    }
    init()
    return () => {
      unsubscribe()
    }
  }, [])

  const handleLogin = React.useCallback(async ({ email, password }) => {
    if (!email || !password) {
      setLoginError('Completa ambos campos para iniciar sesión.')
      return
    }
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    if (!trimmedEmail || !trimmedPassword) {
      setLoginError('Completa ambos campos para iniciar sesión.')
      return
    }
    try {
      setLoginError('')
      setLoginPending(true)
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
      setAuthenticated(true)
    } catch (err) {
      console.warn('[Login] error', err)
      const code = err?.code ?? ''
      if (typeof code === 'string') {
        switch (code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            setLoginError('Credenciales inválidas. Revisa tu correo y contraseña.')
            break
          case 'auth/too-many-requests':
            setLoginError('Demasiados intentos. Intenta nuevamente más tarde.')
            break
          default:
            setLoginError('No se pudo iniciar sesión. Intenta nuevamente.')
            break
        }
      } else {
        setLoginError('No se pudo iniciar sesión. Intenta nuevamente.')
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
      setLoginError('')
    }
  }

  return (
    <div className="app">
      <div className="sheet-container">
        <div className="sheet-heading-row">
          <h1 className="sheet-heading">Registro de reuniones obtenidas</h1>
          <Button
            variant="outline"
            className="logout-button"
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        </div>
        <Sheet />
      </div>
    </div>
  )
}
