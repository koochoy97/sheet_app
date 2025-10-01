import React from 'react'

export default function ClientFilter({ value, options = [], onChange, disabled = false, large = false }) {
  const wrapperRef = React.useRef(null)
  const inputRef = React.useRef(null)
  const [open, setOpen] = React.useState(false)

  const normalized = React.useMemo(() => options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt }
    }
    const raw = opt?.value ?? opt?.id ?? opt?.label ?? ''
    const val = String(raw)
    const label = opt?.label ?? val
    const id = opt?.id != null ? opt.id : (opt?.value != null && /^\d+$/.test(String(opt.value)) ? Number(opt.value) : null)
    return { value: val, label, id }
  }), [options])

  const selected = React.useMemo(() => normalized.find(opt => opt.value === value) || null, [normalized, value])
  const [query, setQuery] = React.useState(selected?.label ?? '')
  const [highlight, setHighlight] = React.useState(0)

  React.useEffect(() => {
    setQuery(selected?.label ?? '')
  }, [selected])

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return normalized
    return normalized.filter(opt => opt.label.toLowerCase().includes(needle))
  }, [normalized, query])

  React.useEffect(() => {
    setHighlight(0)
  }, [filtered])

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
        setQuery(selected?.label ?? '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selected])

  React.useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const selectOption = React.useCallback((opt) => {
    onChange(opt.value)
    setQuery(opt.label)
    setOpen(false)
  }, [onChange])

  const openDropdown = () => {
    if (disabled) return
    setQuery('')
    setHighlight(0)
    setOpen(true)
  }

  const handleTriggerKeyDown = (event) => {
    if (disabled) return
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      if (open) {
        setOpen(false)
        setQuery(selected?.label ?? '')
      } else {
        openDropdown()
      }
    }
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight(prev => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const opt = filtered[highlight]
      if (opt) selectOption(opt)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setQuery(selected?.label ?? '')
    }
  }

  const labelStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: large ? 18 : undefined }

  return (
    <label style={labelStyle}>
      <span style={{fontWeight:700}}>Cliente:</span>
      <div className={`client-filter-wrapper${disabled ? ' is-disabled' : ''}`} ref={wrapperRef}>
        <button
          type="button"
          className="client-filter-trigger client-title-trigger"
          onClick={() => {
            if (open) {
              setOpen(false)
              setQuery(selected?.label ?? '')
            } else {
              openDropdown()
            }
          }}
          onKeyDown={handleTriggerKeyDown}
          disabled={disabled}
        >
          <span>{selected?.label ?? 'Seleccione cliente'}</span>
          <span className="client-filter-caret">▾</span>
        </button>
        {open && (
          <div className="client-filter-dropdown" role="listbox">
            <input
              ref={inputRef}
              className="client-filter-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar cliente"
              autoComplete="off"
            />
            <ul>
              {filtered.map((opt, index) => (
                <li
                  key={`${opt.value}-${opt.label}`}
                  className={`client-filter-option${index === highlight ? ' is-active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); selectOption(opt) }}
                >
                  <span className="client-filter-option-label">{opt.label}</span>
                  {opt.id != null && <span className="client-filter-option-meta">#{opt.id}</span>}
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="client-filter-option empty">Sin coincidencias</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </label>
  )
}
