import React from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'

export default function Login({
  onSubmit,
  submitting = false,
  error = '',
}) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (submitting) return
    const nextEmail = email.trim()
    const nextPassword = password.trim()
    onSubmit?.({ email: nextEmail, password: nextPassword })
  }

  return (
    <div className="login-page">
      <img
        src="https://cdn.prod.website-files.com/649a0fe3de34a0462eac8785/649d24608aeae2926e69d67c_logo_dark.png"
        alt="We Are Siete"
        className="login-logo"
        loading="lazy"
      />
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-brand-title">Reuniones SDR</h1>
          <p className="login-subtitle">Acceso protegido, ingresa tus credenciales.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Correo electrónico</span>
            <Input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Ingresa tu correo"
              autoComplete="email"
              disabled={submitting}
              required
            />
          </label>
          <label className="login-field">
            <span>Contraseña</span>
            <Input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
              disabled={submitting}
              required
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <Button
            type="submit"
            className="login-submit"
            disabled={submitting}
          >
            {submitting ? 'Verificando…' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
