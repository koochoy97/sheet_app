import React from 'react'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'

export function sanitizeLineaValues(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const list = []
  for (const item of value) {
    const num = Number(item)
    if (!Number.isFinite(num)) continue
    if (seen.has(num)) continue
    seen.add(num)
    list.push(num)
  }
  list.sort((a, b) => a - b)
  return list
}

export default function LineaNegocioDropdown({
  values = [],
  options = [],
  disabled = false,
  onSelectionChange,
  onCommit,
  onOpen,
  summaryPlaceholder = 'Seleccionar',
  source = 'unknown',
}) {
  const [open, setOpen] = React.useState(false)
  const [selection, setSelection] = React.useState(sanitizeLineaValues(values))

  React.useEffect(() => {
    if (!open) setSelection(sanitizeLineaValues(values))
  }, [values, open])

  const optionLookup = React.useMemo(() => {
    const map = new Map()
    for (const opt of options) {
      if (!opt) continue
      const key = Number.isFinite(Number(opt.id)) ? Number(opt.id) : opt.id
      if (key === null || key === undefined) continue
      map.set(key, opt.label)
    }
    return map
  }, [options])

  const activeValues = open ? selection : sanitizeLineaValues(values)

  const selectedSet = React.useMemo(() => {
    const set = new Set()
    for (const val of activeValues) {
      const num = Number(val)
      if (!Number.isFinite(num)) continue
      set.add(num)
    }
    return set
  }, [activeValues])

  const selectedLabels = React.useMemo(() => {
    const labels = []
    selectedSet.forEach(val => {
      labels.push(optionLookup.get(val) || `ID ${val}`)
    })
    return labels
  }, [selectedSet, optionLookup])

  const summary = React.useMemo(() => {
    if (!selectedLabels.length) return summaryPlaceholder
    if (selectedLabels.length <= 2) return selectedLabels.join(', ')
    const firstTwo = selectedLabels.slice(0, 2).join(', ')
    return `${firstTwo} +${selectedLabels.length - 2}`
  }, [selectedLabels, summaryPlaceholder])

  const handleOpenChange = (next) => {
    setOpen(next)
    if (next) {
      setSelection(sanitizeLineaValues(values))
      onOpen?.()
      try {
        console.log(`[LineaDropdown:${source}] open`, { options: options.length, values: sanitizeLineaValues(values) })
      } catch {}
    } else {
      const sanitized = sanitizeLineaValues(selection)
      setSelection(sanitized)
      onCommit?.(sanitized)
      try {
        console.log(`[LineaDropdown:${source}] close`, { commit: sanitized })
      } catch {}
    }
  }

  const updateAndNotify = (nextSelection) => {
    const sanitized = sanitizeLineaValues(nextSelection)
    setSelection(sanitized)
    onSelectionChange?.(sanitized)
    try {
      console.log(`[LineaDropdown:${source}] selection-change`, { values: sanitized })
    } catch {}
  }

  const toggleValue = (id) => {
    const num = Number(id)
    if (!Number.isFinite(num)) return
    updateAndNotify(selection.includes(num) ? selection.filter(v => v !== num) : [...selection, num])
  }

  const clearSelection = () => {
    if (selection.length === 0) return
    updateAndNotify([])
    try {
      console.log(`[LineaDropdown:${source}] cleared`)
    } catch {}
  }

  const hasValue = selection.length > 0

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className={`linea-select-trigger ${hasValue ? 'has-value' : ''}`} disabled={disabled}>
          <span className="linea-select-label" title={selectedLabels.join(', ')}>{summary}</span>
          <span className="linea-select-caret" aria-hidden>▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="linea-popover" align="start">
        <div className="linea-popover-body">
          {options.length ? (
            <ul className="linea-multi-list">
              {options.map(opt => {
                const key = Number.isFinite(Number(opt.id)) ? Number(opt.id) : opt.id
                const checked = Number.isFinite(Number(key)) ? selection.includes(Number(key)) : false
                return (
                  <li key={String(opt.id)}>
                    <label className="linea-multi-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleValue(opt.id)}
                        disabled={disabled}
                      />
                      <span>{opt.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="linea-multi-empty">Sin opciones para este cliente</div>
          )}
        </div>
        <div className="linea-popover-footer">
          <span className="linea-count-pill">{selection.length} seleccionadas</span>
          <button type="button" className="linea-clear-btn" onClick={clearSelection} disabled={selection.length === 0 || disabled}>Limpiar</button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
