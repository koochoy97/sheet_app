import React from 'react'
import { Button } from './ui/button'

const formatValue = (value) => {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export default function BriefDialog({ open, row, fields = [], onClose, onConfirm, sending = false, error = '' }) {
  if (!open || !row) return null

  return (
    <div className="brief-dialog-overlay" role="dialog" aria-modal="true">
      <div className="brief-dialog">
        <header className="brief-dialog__header">
          <h3>Enviar brief</h3>
          <button type="button" className="brief-dialog__close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="brief-dialog__body">
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
          {error && <p className="brief-dialog__error">{error}</p>}
        </div>
        <footer className="brief-dialog__actions">
          <Button onClick={onConfirm} disabled={sending || Boolean(error)} className="bg-blue-600 hover:bg-blue-700 text-white">
            {sending ? 'Enviando…' : 'Confirmar envío'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
        </footer>
      </div>
    </div>
  )
}
