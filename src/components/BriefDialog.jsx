import React from 'react'
import { Button } from './ui/button'

const formatValue = (value) => {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

const formatEmails = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(item => (item == null ? '' : String(item).trim()))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/)
      .map(item => item.trim())
      .filter(Boolean)
      .join(', ')
  }
  if (value == null) return ''
  return String(value)
}

const formatResponseMessage = (value) => {
  if (!value) return ''
  try {
    const parsed = JSON.parse(value)
    return JSON.stringify(parsed, null, 2)
  } catch (err) {
    return value
  }
}

export default function BriefDialog({
  open,
  row,
  fields = [],
  onClose,
  onConfirm,
  sending = false,
  error = '',
  responseMessage = '',
}) {
  if (!open || !row) return null
  const emailsLabel = formatEmails(row.AE_mails)
  const showResponse = Boolean(responseMessage && !error)
  const responseText = formatResponseMessage(responseMessage)

  return (
    <div className="brief-dialog-overlay" role="dialog" aria-modal="true">
      <div className="brief-dialog">
        <header className="brief-dialog__header">
          <h3>Enviar brief</h3>
          <button type="button" className="brief-dialog__close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="brief-dialog__body">
          {!showResponse && (
            <>
              <h4 className="brief-dialog__heading">
                Se enviará un correo a{' '}
                {emailsLabel ? (
                  <span className="brief-dialog__emails">{emailsLabel}</span>
                ) : (
                  <span className="brief-dialog__placeholder">—</span>
                )}
              </h4>
              <p className="brief-dialog__intro">Revisa la información antes de enviar:</p>
              <dl className="brief-dialog__summary">
                {fields.map(field => {
                  const value = formatValue(row[field.key])
                  return (
                    <React.Fragment key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>{value || <span className="brief-dialog__placeholder">—</span>}</dd>
                    </React.Fragment>
                  )
                })}
              </dl>
            </>
          )}
          {error && <p className="brief-dialog__error">{error}</p>}
          {showResponse && (
            <div className="brief-dialog__response">
              <pre>{responseText}</pre>
            </div>
          )}
        </div>
        <footer className="brief-dialog__actions">
          <Button
            onClick={onConfirm}
            disabled={sending || Boolean(error) || showResponse}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {sending ? 'Enviando…' : 'Confirmar envío'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            {showResponse ? 'Cerrar' : 'Cancelar'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
