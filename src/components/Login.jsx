import React from 'react'
import { Button } from './ui/button'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
)

export default function Login({
  onSubmit,
  submitting = false,
  error = '',
}) {
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
          <p className="login-subtitle">Ingresa con tu cuenta de Siete.</p>
        </div>
        <div className="login-form">
          {error && <p className="login-error">{error}</p>}
          <Button
            type="button"
            className="login-submit login-google"
            onClick={() => !submitting && onSubmit?.()}
            disabled={submitting}
          >
            <GoogleIcon />
            <span>{submitting ? 'Verificando…' : 'Continuar con Google'}</span>
          </Button>
          <p className="login-subtitle" style={{ marginTop: 4 }}>
            Solo cuentas @wearesiete.com.
          </p>
        </div>
      </div>
    </div>
  )
}
