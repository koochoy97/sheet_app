import React from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
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
      if (prev.includes(value)) return prev.filter(item => item !== value)
      return [...prev, value]
    })
  }

  const disableConfirm = mode === 'clients' && selected.length === 0

  return (
    <Dialog open={open} onClose={exporting ? () => {} : onClose} className="relative z-[1250]">
      <div className="fixed inset-0 bg-gray-900/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-gray-100 grid grid-rows-[auto_1fr_auto] max-h-[calc(100vh-48px)]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900 tracking-tight">Exportar datos</DialogTitle>
            <button
              type="button"
              onClick={() => !exporting && onClose?.()}
              aria-label="Cerrar"
              className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors border-0 bg-transparent text-lg"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 overflow-auto grid gap-3">
            <p className="text-[13px] text-gray-500 m-0">
              Selecciona el alcance de la exportación. El archivo incluirá todos los campos entregados por la API.
            </p>

            <label className="flex gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <input
                type="radio"
                name="export-mode"
                value="all"
                checked={mode === 'all'}
                onChange={() => setMode('all')}
                disabled={exporting}
                className="mt-0.5 accent-slate-900"
              />
              <div>
                <strong className="block text-[14px] font-semibold text-gray-900">Todos los clientes</strong>
                <p className="m-0 text-[13px] text-gray-500 mt-0.5">Descarga consolidada con todos los registros disponibles.</p>
              </div>
            </label>

            <label className="flex gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors">
              <input
                type="radio"
                name="export-mode"
                value="clients"
                checked={mode === 'clients'}
                onChange={() => setMode('clients')}
                disabled={exporting}
                className="mt-0.5 accent-slate-900"
              />
              <div>
                <strong className="block text-[14px] font-semibold text-gray-900">Filtrar por clientes</strong>
                <p className="m-0 text-[13px] text-gray-500 mt-0.5">Selecciona uno o varios clientes específicos.</p>
              </div>
            </label>

            {mode === 'clients' && (
              <div className="grid gap-2">
                <Input
                  placeholder="Buscar cliente…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  disabled={exporting}
                />
                <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-1">
                  {filteredClients.length === 0 && (
                    <p className="text-center text-gray-400 text-[13px] py-4 m-0">No hay coincidencias</p>
                  )}
                  {filteredClients.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selected.includes(opt.value)}
                        onChange={() => toggleClient(opt.value)}
                        disabled={exporting}
                        className="accent-slate-900"
                      />
                      <span className="flex-1 text-[13px] font-medium text-gray-900">{opt.label}</span>
                      {opt.id != null && (
                        <span className="text-[11px] text-gray-400">#{opt.id}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-5 py-3.5 grid gap-2">
            {error && <p className="m-0 text-red-600 text-[13px]">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={exporting}>Cancelar</Button>
              <Button
                onClick={() => onConfirm?.({ mode, clientValues: selected })}
                disabled={disableConfirm || exporting}
              >
                {exporting ? 'Exportando…' : 'Exportar'}
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
