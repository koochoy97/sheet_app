import React from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Button } from './ui/button'

const formatValue = (value) => {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

const formatEmails = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(item => (item == null ? '' : String(item).trim()))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/)
      .map(item => item.trim())
      .filter(Boolean)
      .join(', ')
  }
  if (value == null) return ''
  return String(value)
}

const formatResponseMessage = (value) => {
  if (!value) return ''
  try {
    const parsed = JSON.parse(value)
    return JSON.stringify(parsed, null, 2)
  } catch (err) {
    return value
  }
}

const PRIMARY_FIELD_KEYS = [
  'company',
  'cliente',
  'lineaNegocioDisplay',
  'fecha',
  'status',
  'kdm',
  'kdm_mail',
  'telefono_cliente',
  'AE_mails',
  'clientSdrDisplay',
  'clientTeamLeadDisplay',
]

export default function BriefDialog({
  open,
  row,
  fields = [],
  onClose,
  onConfirm,
  sending = false,
  sendingStep = '',
  onCancelSend,
  error = '',
  responseMessage = '',
}) {

  const [showDetails, setShowDetails] = React.useState(false)

  const parsedResponse = React.useMemo(() => {
    if (!responseMessage) return null
    try {
      return JSON.parse(responseMessage)
    } catch {
      return null
    }
  }, [responseMessage])

  const structuredResponse = React.useMemo(() => {
    if (!parsedResponse) return null
    const list = Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse]
    const normalized = list
      .map(item => {
        if (!item || typeof item !== 'object') return null
        const rawHeading = item.Heading ?? item.heading ?? item.title ?? ''
        const rawLink = item['Link del Brief'] ?? item.link ?? item.url ?? ''
        const heading = rawHeading ? String(rawHeading).trim() : ''
        const link = rawLink ? String(rawLink).trim() : ''
        if (!heading && !link) return null
        return { heading, link }
      })
      .filter(Boolean)
    return normalized.length ? normalized : null
  }, [parsedResponse])

  const fieldBuckets = React.useMemo(() => {
    const fieldMap = new Map()
    for (const field of fields) {
      if (!field || !field.key) continue
      fieldMap.set(field.key, field)
    }
    const primary = PRIMARY_FIELD_KEYS.map(key => fieldMap.get(key)).filter(Boolean)
    const seen = new Set(primary.map(f => f.key))
    const extra = fields.filter(field => field && field.key && !seen.has(field.key))
    return { primary, extra }
  }, [fields])

  React.useEffect(() => {
    setShowDetails(false)
  }, [row])

  if (!row) return null
  const emailsLabel = formatEmails(row.AE_mails)
  const showResponse = Boolean(responseMessage && !error)
  const responseText = formatResponseMessage(responseMessage)

  return (
    <Dialog open={open} onClose={sending ? () => {} : onClose} className="relative z-[1200]">
      {/* Overlay */}
      <div className="fixed inset-0 bg-gray-900/40" aria-hidden="true" />
      {/* Center panel */}
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="w-full max-w-xl rounded-xl bg-white shadow-2xl border border-gray-100 grid grid-rows-[auto_1fr_auto] max-h-[calc(100vh-48px)]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900 tracking-tight">Enviar brief</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors border-0 bg-transparent text-lg"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 overflow-auto grid gap-4">
            {!showResponse && (
              <>
                <p className="text-sm text-gray-600 m-0">
                  Se enviará un correo a{' '}
                  {emailsLabel ? (
                    <span className="font-semibold text-gray-900">{emailsLabel}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </p>
                <p className="text-[13px] text-gray-400 m-0 -mt-2">Revisa la información antes de enviar:</p>
                <dl className="grid gap-y-2.5 m-0" style={{ gridTemplateColumns: 'minmax(0,180px) 1fr', fontSize: 13, lineHeight: '1.5' }}>
                  {fieldBuckets.primary.map(field => {
                    const value = formatValue(row[field.key])
                    return (
                      <React.Fragment key={field.key}>
                        <dt className="font-medium text-gray-500">{field.label}</dt>
                        <dd className="m-0 text-gray-900 font-medium">{value || <span className="text-gray-300">—</span>}</dd>
                      </React.Fragment>
                    )
                  })}
                </dl>
                {fieldBuckets.extra.length > 0 && (
                  <div className="mt-1 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDetails(prev => !prev)}
                      className="border border-gray-200 rounded-full px-3 py-1 text-[12px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 self-start transition-colors"
                    >
                      {showDetails ? 'Ocultar detalles' : 'Mostrar más detalles'}
                    </button>
                    {showDetails && (
                      <dl className="grid gap-y-2.5 m-0 mt-1" style={{ gridTemplateColumns: 'minmax(0,180px) 1fr', fontSize: 13, lineHeight: '1.5' }}>
                        {fieldBuckets.extra.map(field => {
                          const value = formatValue(row[field.key])
                          return (
                            <React.Fragment key={field.key}>
                              <dt className="font-medium text-gray-500">{field.label}</dt>
                              <dd className="m-0 text-gray-900 font-medium">{value || <span className="text-gray-300">—</span>}</dd>
                            </React.Fragment>
                          )
                        })}
                      </dl>
                    )}
                  </div>
                )}
                {row.clientContactWarning && (
                  <p className="m-0 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 text-[13px]">{row.clientContactWarning}</p>
                )}
              </>
            )}
            {error && <p className="m-0 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-[13px]">{error}</p>}
            {showResponse && (
              <div>
                {structuredResponse ? (
                  structuredResponse.map((item, index) => (
                    <div key={index} className="mb-3 last:mb-0">
                      {item.heading && (
                        <h3 className="m-0 mb-1 text-[15px] font-semibold text-gray-900">{item.heading}</h3>
                      )}
                      {item.link && (
                        <p className="m-0">
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium text-sm">
                            Ver Brief
                          </a>
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">{responseText}</pre>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <Button
              onClick={onConfirm}
              disabled={sending || Boolean(error) || showResponse}
            >
              {sending ? (sendingStep || 'Enviando…') : 'Confirmar envío'}
            </Button>
            <Button
              variant="ghost"
              onClick={sending ? onCancelSend : onClose}
            >
              {showResponse ? 'Cerrar' : sending ? 'Cancelar' : 'Cancelar'}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
