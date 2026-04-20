import React from 'react'
import ReactDOM from 'react-dom'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'

const TRUNCATE_LEN = 52
const TOOLTIP_WIDTH = 240

function truncate(text) {
  if (!text) return ''
  return text.length > TRUNCATE_LEN ? text.slice(0, TRUNCATE_LEN) + '…' : text
}

function matchesQuery(opt, q) {
  if (!q) return true
  const lower = q.toLowerCase()
  return (
    opt.nombre.toLowerCase().includes(lower) ||
    (opt.short_description ?? '').toLowerCase().includes(lower)
  )
}

export default function IcpDropdown({
  value = null,
  options = [],
  disabled = false,
  onChange,
  placeholder = 'Seleccionar ICP',
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [tooltipId, setTooltipId] = React.useState(null)
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 })

  const selected = options.find(o => o.id === value) ?? null
  const filtered = options.filter(o => matchesQuery(o, query))
  const tooltipOpt = tooltipId !== null ? options.find(o => o.id === tooltipId) : null

  const handleOpenChange = (next) => {
    setOpen(next)
    if (!next) setQuery('')
  }

  const handleSelect = (id) => {
    onChange?.(id === value ? null : id)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`linea-select-trigger ${selected ? 'has-value' : ''}`}
            style={{ width: '100%' }}
            disabled={disabled}
          >
            <span className="linea-select-label" title={selected?.nombre ?? ''}>
              {selected?.nombre ?? placeholder}
            </span>
            <span className="linea-select-caret" aria-hidden>▾</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="linea-popover icp-popover"
          align="start"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <div className="icp-search-wrap">
            <input
              className="icp-search"
              type="text"
              placeholder="Buscar ICP…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="icp-list">
            {filtered.length ? filtered.map(opt => (
              <li key={opt.id} className="icp-option-row">
                <button
                  type="button"
                  className={`icp-option-btn ${value === opt.id ? 'is-selected' : ''}`}
                  onClick={() => handleSelect(opt.id)}
                  disabled={disabled}
                >
                  <span className="icp-option-nombre">{opt.nombre}</span>
                  {opt.short_description && (
                    <span className="icp-option-desc">{truncate(opt.short_description)}</span>
                  )}
                </button>
                {(opt.short_description || opt.nombre) && (
                  <button
                    type="button"
                    className="icp-info-btn"
                    tabIndex={-1}
                    aria-label="Ver descripción completa"
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={(e) => {
                      const r = e.currentTarget.getBoundingClientRect()
                      setTooltipPos({ x: r.left - TOOLTIP_WIDTH - 8, y: r.top })
                      setTooltipId(opt.id)
                    }}
                    onMouseLeave={() => setTooltipId(null)}
                  >
                    ℹ
                  </button>
                )}
              </li>
            )) : (
              <li className="linea-multi-empty">Sin resultados</li>
            )}
          </ul>
          {selected && (
            <div className="linea-popover-footer">
              <span />
              <button
                type="button"
                className="linea-clear-btn"
                onClick={() => { onChange?.(null); setOpen(false) }}
              >
                Limpiar
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {tooltipOpt && ReactDOM.createPortal(
        <div
          className="icp-tooltip"
          style={{ position: 'fixed', left: tooltipPos.x, top: tooltipPos.y }}
        >
          <strong className="icp-tooltip-nombre">{tooltipOpt.nombre}</strong>
          {tooltipOpt.short_description && (
            <p className="icp-tooltip-desc">{tooltipOpt.short_description}</p>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
