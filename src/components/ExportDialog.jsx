import React from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'

const normalizeClients = (clients = []) => {
  return clients
    .map(opt => {
      if (!opt) return null
      const value = String(opt.value ?? opt.id ?? '')
      const label = opt.label ?? value
      const id = opt.id ?? null
      return value ? { value, label, id } : null
    })
    .filter(Boolean)
}

export default function ExportDialog({
  open,
  clients = [],
  defaultClientValue = '',
  exporting = false,
  error = '',
  onClose,
  onConfirm,
}) {
  const normalizedClients = React.useMemo(() => normalizeClients(clients), [clients])
  const [mode, setMode] = React.useState('all')
  const [query, setQuery] = React.useState('')
  const [selected, setSelected] = React.useState([])

  React.useEffect(() => {
    if (!open) return
    const initialSelection = defaultClientValue && defaultClientValue !== '__ALL__'
      ? [defaultClientValue]
      : []
    setMode(initialSelection.length ? 'clients' : 'all')
    setSelected(initialSelection)
    setQuery('')
  }, [open, defaultClientValue])

  const filteredClients = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return normalizedClients
    return normalizedClients.filter(opt => opt.label.toLowerCase().includes(needle))
  }, [normalizedClients, query])

  const toggleClient = (value) => {
    setSelected(prev => {
      if (prev.includes(value)) {
        return prev.filter(item => item !== value)
      }
      return [...prev, value]
    })
  }

  if (!open) return null

  const disableConfirm = mode === 'clients' && selected.length === 0

  return (
    <div className="export-dialog-overlay" role="dialog" aria-modal="true">
      <div className="export-dialog">
        <header className="export-dialog__header">
          <h3>Exportar datos</h3>
          <button
            type="button"
            className="export-dialog__close"
            aria-label="Cerrar"
            onClick={() => {
              if (!exporting) onClose?.()
            }}
          >
            ×
          </button>
        </header>
        <div className="export-dialog__body">
          <p className="export-dialog__intro">
            Selecciona el alcance de la exportación. El archivo incluirá todos los campos entregados por la API.
          </p>
          <label className="export-dialog__option">
            <input
              type="radio"
              name="export-mode"
              value="all"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              disabled={exporting}
            />
            <div>
              <strong>Todos los clientes</strong>
              <p>Descarga consolidada con todos los registros disponibles.</p>
            </div>
          </label>
          <label className="export-dialog__option">
            <input
              type="radio"
              name="export-mode"
              value="clients"
              checked={mode === 'clients'}
              onChange={() => setMode('clients')}
              disabled={exporting}
            />
            <div>
              <strong>Filtrar por clientes</strong>
              <p>Selecciona uno o varios clientes específicos.</p>
            </div>
          </label>
          {mode === 'clients' && (
            <div className="export-dialog__multiselect">
              <Input
                placeholder="Buscar cliente"
                value={query}
                onChange={e => setQuery(e.target.value)}
                disabled={exporting}
              />
              <div className="export-dialog__list">
                {filteredClients.length === 0 && (
                  <p className="export-dialog__empty">No hay coincidencias</p>
                )}
                {filteredClients.map(opt => (
                  <label key={opt.value} className="export-dialog__client">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt.value)}
                      onChange={() => toggleClient(opt.value)}
                      disabled={exporting}
                    />
                    <span className="export-dialog__client-name">{opt.label}</span>
                    {opt.id != null && (
                      <span className="export-dialog__client-id">#{opt.id}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <footer className="export-dialog__footer">
          {error && <p className="export-dialog__error">{error}</p>}
          <div className="export-dialog__actions">
            <Button variant="secondary" onClick={onClose} disabled={exporting}>Cancelar</Button>
            <Button
              onClick={() => {
                onConfirm?.({
                  mode,
                  clientValues: selected,
                })
              }}
              disabled={disableConfirm || exporting}
            >
              {exporting ? 'Exportando…' : 'Exportar'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
