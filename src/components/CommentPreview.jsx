import React from 'react'
import { createPortal } from 'react-dom'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Textarea } from './ui/textarea'

function ExpandIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 1.5H10.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.5 10.5H1.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.5 1.5L7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M1.5 10.5L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

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
    const focusTimer = requestAnimationFrame(() => {
      textareaRef.current?.focus?.()
    })
    return () => cancelAnimationFrame(focusTimer)
  }, [open])

  const closeDialog = (reason) => {
    setOpen(false)
    if (textareaRef.current) {
      const syntheticBlur = {
        target: { value: textareaRef.current.value },
        currentTarget: { value: textareaRef.current.value },
        type: 'blur',
        reason,
        preventDefault: () => {},
        stopPropagation: () => {},
      }
      onBlur?.(syntheticBlur)
    }
  }

  return (
    <>
      <div className="relative flex items-center w-full">
        <input
          type="text"
          value={normalized}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus-visible:outline-none focus-visible:border-gray-400"
        />
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-label="Expandir comentario"
          title="Expandir"
          className="absolute right-2 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-0 bg-transparent p-0"
        >
          <ExpandIcon />
        </button>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <Dialog open={open} onClose={() => closeDialog('overlay')} className="relative z-[1150]">
          <div className="fixed inset-0 bg-gray-900/40" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-5">
            <DialogPanel
              className="w-full max-w-xl rounded-xl bg-white shadow-2xl border border-gray-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                <DialogTitle className="text-sm font-semibold text-gray-900">Comentario</DialogTitle>
                <button
                  type="button"
                  onClick={() => closeDialog('close-button')}
                  aria-label="Cerrar"
                  className="flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors border-0 bg-transparent text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                <textarea
                  ref={textareaRef}
                  value={normalized}
                  disabled={disabled}
                  onChange={onChange}
                  onBlur={() => closeDialog('textarea-blur')}
                  style={{ height: 'min(400px, calc(100vh - 220px))' }}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 leading-relaxed resize-none overflow-y-auto focus:outline-none focus:border-gray-400"
                />
              </div>
            </DialogPanel>
          </div>
        </Dialog>,
        document.body
      )}
    </>
  )
}
