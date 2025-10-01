import React from 'react'

const RELATIVE_OPTIONS = [
  { label: 'Todo el tiempo', getRange: () => ({ start: null, end: null }) },
  { label: 'Hoy', getRange: () => {
    const today = new Date()
    const start = formatISODate(today)
    return { start, end: start }
  } },
  { label: 'Últimos 7 días', getRange: () => {
    const end = new Date()
    const start = addDays(end, -6)
    return { start: formatISODate(start), end: formatISODate(end) }
  } },
  { label: 'Últimos 30 días', getRange: () => {
    const end = new Date()
    const start = addDays(end, -29)
    return { start: formatISODate(start), end: formatISODate(end) }
  } },
  { label: 'Este mes', getRange: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { start: formatISODate(start), end: formatISODate(end) }
  } },
  { label: 'Mes pasado', getRange: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: formatISODate(start), end: formatISODate(end) }
  } },
  { label: 'Este año', getRange: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31)
    return { start: formatISODate(start), end: formatISODate(end) }
  } },
]

function formatISODate(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return d.toISOString().slice(0, 10)
}

function addDays(date, amount) {
  const d = new Date(date)
  d.setDate(d.getDate() + amount)
  return d
}

export default function DateFilter({ value, onChange, disabled = false }) {
  const wrapperRef = React.useRef(null)
  const [open, setOpen] = React.useState(false)
  const [range, setRange] = React.useState({ start: value?.start ?? '', end: value?.end ?? '' })

  React.useEffect(() => {
    setRange({ start: value?.start ?? '', end: value?.end ?? '' })
  }, [value?.start, value?.end])

  React.useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSelect = (opt) => {
    const { start, end } = opt.getRange()
    onChange({ label: opt.label, start, end })
    setOpen(false)
  }

  const applyCustomRange = () => {
    if (range.start && range.end && range.start > range.end) return
    onChange({ label: 'Rango personalizado', start: range.start || null, end: range.end || null })
    setOpen(false)
  }

  const clearRange = () => {
    const clear = RELATIVE_OPTIONS[0]
    const { start, end } = clear.getRange()
    onChange({ label: clear.label, start, end })
    setOpen(false)
  }

  const currentLabel = value?.label || 'Todo el tiempo'

  const showNativePicker = (event) => {
    if (event.target?.showPicker) {
      requestAnimationFrame(() => event.target.showPicker())
    }
  }

  return (
    <div className={`date-filter-wrapper${disabled ? ' is-disabled' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="date-filter-trigger"
        onClick={() => !disabled && setOpen(prev => !prev)}
        disabled={disabled}
      >
        <span>{currentLabel}</span>
        <span className="client-filter-caret">▾</span>
      </button>
      {open && (
        <div className="date-filter-dropdown">
          <div className="date-filter-section">
            <h4>Fechas relativas</h4>
            <ul>
              {RELATIVE_OPTIONS.map(opt => (
                <li key={opt.label}>
                  <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => handleSelect(opt)}>
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="date-filter-section">
            <h4>Rango personalizado</h4>
            <div className="date-filter-range">
              <div>
                <span>Desde</span>
                <input
                  type="date"
                  value={range.start}
                  onChange={e => setRange(prev => ({ ...prev, start: e.target.value }))}
                  onFocus={showNativePicker}
                />
              </div>
              <div>
                <span>Hasta</span>
                <input
                  type="date"
                  value={range.end}
                  onChange={e => setRange(prev => ({ ...prev, end: e.target.value }))}
                  onFocus={showNativePicker}
                />
              </div>
            </div>
            <div className="date-filter-actions">
              <button type="button" onClick={clearRange}>Limpiar</button>
              <button type="button" className="primary" onClick={applyCustomRange}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
