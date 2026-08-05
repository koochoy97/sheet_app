import React from 'react'
import { createPortal } from 'react-dom'

/**
 * Dropdown custom reutilizable (reemplaza a los <select> nativos).
 * - options: [{ value, label }] o [string]
 * - value: valor seleccionado (string)
 * - onChange(value)
 * - El menú se renderiza en un portal con posición fija, así no lo corta
 *   el overflow de la tabla ni de contenedores con scroll.
 */
export default function Dropdown({
  value,
  options = [],
  onChange,
  disabled = false,
  placeholder = 'Seleccionar',
  className = '',
  triggerClassName = '',
  renderTriggerLabel,
  ariaLabel,
}) {
  const triggerRef = React.useRef(null)
  const menuRef = React.useRef(null)
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 })

  const normalized = React.useMemo(() => options.map(opt => (
    typeof opt === 'string' || typeof opt === 'number'
      ? { value: String(opt), label: String(opt) }
      : { value: String(opt.value), label: opt.label ?? String(opt.value) }
  )), [options])

  const selected = React.useMemo(
    () => normalized.find(o => o.value === String(value ?? '')) || null,
    [normalized, value]
  )

  const place = React.useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCoords({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [])

  const openMenu = () => {
    if (disabled) return
    place()
    setOpen(true)
  }

  React.useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) return
      setOpen(false)
    }
    const reposition = () => place()
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, place])

  const pick = (opt) => {
    onChange(opt.value)
    setOpen(false)
  }

  const onTriggerKeyDown = (e) => {
    if (disabled) return
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault()
      open ? setOpen(false) : openMenu()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const label = selected
    ? (renderTriggerLabel ? renderTriggerLabel(selected) : selected.label)
    : <span className="dd-placeholder">{placeholder}</span>

  return (
    <div className={`dd ${className}`}>
      <button
        type="button"
        ref={triggerRef}
        className={`dd-trigger ${triggerClassName}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="dd-label">{label}</span>
        <span className="dd-caret" aria-hidden>▾</span>
      </button>
      {open && createPortal(
        <ul
          ref={menuRef}
          className="dd-menu"
          role="listbox"
          style={{ top: coords.top, left: coords.left, minWidth: coords.width }}
        >
          {normalized.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === String(value ?? '')}
              className={`dd-option${opt.value === String(value ?? '') ? ' is-selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(opt) }}
            >
              {opt.label}
            </li>
          ))}
          {normalized.length === 0 && <li className="dd-option is-empty">Sin opciones</li>}
        </ul>,
        document.body
      )}
    </div>
  )
}
