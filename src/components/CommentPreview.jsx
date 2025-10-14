import React from 'react'
import { createPortal } from 'react-dom'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

export default function CommentPreview({
  value = '',
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  placeholder = '',
}) {
  const [open, setOpen] = React.useState(false)
  const normalized = value ?? ''
  const textareaRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeDialog('escape')
      }
    }
    document.addEventListener('keydown', handleKey)
    const focusTimer = requestAnimationFrame(() => {
      textareaRef.current?.focus?.()
    })
    return () => {
      document.removeEventListener('keydown', handleKey)
      cancelAnimationFrame(focusTimer)
    }
  }, [open])

  const closeDialog = (reason) => {
    setOpen(false)
    if (textareaRef.current) {
      const syntheticBlur = {
        target: {
          value: textareaRef.current.value,
        },
        currentTarget: {
          value: textareaRef.current.value,
        },
        type: 'blur',
        reason,
        preventDefault: () => {},
        stopPropagation: () => {},
      }
      onBlur?.(syntheticBlur)
    }
  }

  const handleDoubleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setOpen(true)
  }

  const handleInputChange = (event) => {
    onChange?.(event)
  }

  const handleOverlayClick = () => {
    closeDialog('overlay')
  }

  const handleCardClick = (event) => {
    event.stopPropagation()
  }

  const handleTextareaBlur = () => {
    closeDialog('textarea-blur')
  }

  const handleCloseClick = () => closeDialog('close-button')

  const overlay = open ? (
    <div className="comment-preview-overlay" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className="comment-preview-card" onClick={handleCardClick}>
        <header className="comment-preview-card__header">
          <h4>Comentario completo</h4>
          <button type="button" className="comment-preview-card__close" onClick={handleCloseClick} aria-label="Cerrar vista de comentario">×</button>
        </header>
        <Textarea
          ref={textareaRef}
          value={normalized}
          rows={10}
          autosize={false}
          disabled={disabled}
          onChange={handleInputChange}
          onBlur={handleTextareaBlur}
          className="comment-preview-card__textarea"
        />
      </div>
    </div>
  ) : null

  return (
    <>
      <Input
        value={normalized}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        onDoubleClick={handleDoubleClick}
      />
      {open && typeof document !== 'undefined' ? createPortal(overlay, document.body) : null}
    </>
  )
}
