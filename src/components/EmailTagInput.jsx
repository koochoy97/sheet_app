import React from 'react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EXTRACT_EMAIL_RE = /<([^>]+@[^>]+)>/

function extractEmail(raw) {
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  const match = trimmed.match(EXTRACT_EMAIL_RE)
  if (match) return match[1].toLowerCase().trim()
  const lower = trimmed.toLowerCase()
  return EMAIL_RE.test(lower) ? lower : ''
}

export default function EmailTagInput({
  values = [],
  suggestions = [],
  onChange,
  onBlur,
  placeholder = 'Agregar correo…',
  disabled = false,
  error = false,
}) {
  const [input, setInput] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [highlightIdx, setHighlightIdx] = React.useState(-1)
  const inputRef = React.useRef(null)
  const wrapperRef = React.useRef(null)

  // Clean values: extract pure emails
  const cleanValues = React.useMemo(
    () => (values || []).map(v => extractEmail(v) || v.trim().toLowerCase()).filter(Boolean),
    [values]
  )

  const normalizedSet = React.useMemo(
    () => new Set(cleanValues),
    [cleanValues]
  )

  const filtered = React.useMemo(() => {
    const q = input.trim().toLowerCase()
    const available = suggestions.filter(s => !normalizedSet.has(s.toLowerCase()))
    if (!q) return available
    return available.filter(s => s.toLowerCase().includes(q))
  }, [input, suggestions, normalizedSet])

  const addEmail = (email) => {
    const clean = extractEmail(email) || email.trim().toLowerCase()
    if (!clean || !EMAIL_RE.test(clean) || normalizedSet.has(clean)) return
    onChange([...cleanValues, clean])
    setInput('')
    setHighlightIdx(-1)
  }

  const removeEmail = (idx) => {
    onChange(cleanValues.filter((_, i) => i !== idx))
  }

  const commitInput = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    const email = extractEmail(trimmed) || trimmed.toLowerCase()
    if (EMAIL_RE.test(email)) {
      addEmail(email)
    }
  }

  const close = () => {
    setOpen(false)
    setHighlightIdx(-1)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault()
      if (open && highlightIdx >= 0 && highlightIdx < filtered.length) {
        addEmail(filtered[highlightIdx])
      } else {
        commitInput()
      }
      return
    }
    if (e.key === 'Backspace' && !input && cleanValues.length) {
      removeEmail(cleanValues.length - 1)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open && filtered.length) setOpen(true)
      setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Escape') {
      close()
    }
  }

  // Close on click outside
  React.useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        commitInput()
        close()
        if (onBlur) onBlur(cleanValues)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, cleanValues, input])

  const handleBlur = (e) => {
    // If focus moves to something inside the wrapper (e.g. suggestion click), don't close
    setTimeout(() => {
      if (wrapperRef.current && wrapperRef.current.contains(document.activeElement)) return
      commitInput()
      close()
      if (onBlur) onBlur(cleanValues)
    }, 100)
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const parts = text.split(/[\n,;\s]+/)
      .map(s => extractEmail(s) || s.trim().toLowerCase())
      .filter(s => EMAIL_RE.test(s))
    if (!parts.length) return
    const unique = []
    const seen = new Set(normalizedSet)
    for (const p of parts) {
      if (!seen.has(p)) {
        seen.add(p)
        unique.push(p)
      }
    }
    if (unique.length) {
      onChange([...cleanValues, ...unique])
      setInput('')
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`email-tag-wrap${error ? ' email-tag-error' : ''}${disabled ? ' email-tag-disabled' : ''}`}
      onClick={() => !disabled && inputRef.current?.focus()}
    >
      <div className="email-tag-list">
        {cleanValues.map((email, idx) => (
          <span key={`${email}-${idx}`} className="email-tag">
            <span className="email-tag-text">{email}</span>
            {!disabled && (
              <button
                type="button"
                className="email-tag-remove"
                onClick={(e) => { e.stopPropagation(); removeEmail(idx) }}
                tabIndex={-1}
                aria-label={`Quitar ${email}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            className="email-tag-input"
            value={input}
            onChange={e => {
              setInput(e.target.value)
              setOpen(true)
              setHighlightIdx(-1)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => { setOpen(true); setHighlightIdx(-1) }}
            onBlur={handleBlur}
            onPaste={handlePaste}
            placeholder={cleanValues.length ? '' : placeholder}
            disabled={disabled}
          />
        )}
      </div>
      {open && filtered.length > 0 && !disabled && (
        <ul className="email-tag-suggestions">
          {filtered.slice(0, 6).map((suggestion, idx) => (
            <li
              key={suggestion}
              className={`email-tag-suggestion${idx === highlightIdx ? ' highlighted' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                addEmail(suggestion)
                inputRef.current?.focus()
              }}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
