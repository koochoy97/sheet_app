import React from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { Button } from './ui/button'
import { Input } from './ui/input'
import ClientFilter from './ClientFilter'
import SheetTable from './SheetTable'
import DateFilter from './DateFilter'
import { useNocoDB } from '../hooks/useNocoDB'
import { COLUMNS as columns, ALL_CLIENTS, STATUS_OPTIONS } from '../constants/sheet'
import { createNocoRecord, archiveNocoRecords, mapRecordToRow, normalizeTextArray, updateNocoRecord } from '../services/nocodb'
import CreateSlide from './CreateSlide'
import BriefDialog from './BriefDialog'

const READ_BASE_URL = 'https://rest.wearesiete.com/siete_service_meetings'
const WRITE_BASE_URL = READ_BASE_URL

const REQUIRED_FIELDS = [
  { key: 'company', label: 'Company' },
  { key: 'fecha', label: 'Fecha de celebración' },
  { key: 'status', label: 'Status' },
  { key: 'kdm', label: 'KDM' },
  { key: 'tituloKdm', label: 'Título del KDM' },
  { key: 'industria', label: 'Industria' },
  { key: 'empleados', label: '# Empleados' },
  { key: 'company_linkedin', label: 'LinkedIn empresa' },
  { key: 'person_linkedin', label: 'LinkedIn persona' },
  { key: 'web_url', label: 'Web' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'AE_mails', label: 'AE mails' },
]

const BRIEF_FIELDS = [
  { key: 'company', label: 'Company' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'fecha', label: 'Fecha de celebración' },
  { key: 'status', label: 'Status' },
  { key: 'kdm', label: 'KDM' },
  { key: 'tituloKdm', label: 'Título del KDM' },
  { key: 'industria', label: 'Industria' },
  { key: 'empleados', label: '# Empleados' },
  { key: 'score', label: 'Score' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'company_linkedin', label: 'LinkedIn empresa' },
  { key: 'person_linkedin', label: 'LinkedIn persona' },
  { key: 'web_url', label: 'Web' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'AE_mails', label: 'AE mails' },
]

const BRIEF_WEBHOOK_URL = 'https://n8n.wearesiete.com/webhook/f98f5529-8ee3-4dda-be59-51a0991e8b2d'

const sanitizeLineaNegocio = (value) => {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const normalized = []
  for (const item of value) {
    const num = Number(item)
    if (!Number.isFinite(num)) continue
    if (seen.has(num)) continue
    seen.add(num)
    normalized.push(num)
  }
  normalized.sort((a, b) => a - b)
  return normalized
}

const sanitizeTextArray = (value) => {
  if (Array.isArray(value)) return normalizeTextArray(value)
  if (typeof value === 'string') return normalizeTextArray(value)
  if (value == null) return []
  return normalizeTextArray([value])
}

const toMailDraftArray = (value) => {
  if (typeof value === 'string') {
    const text = value.replace(/\r/g, '')
    return text.split('\n').map(item => item.trim())
  }
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item.trim()
      if (item == null) return ''
      return String(item).trim()
    })
  }
  if (value == null) return []
  return [String(value)]
}

function toCSV(rows) {
  const header = columns.map(c => c.label)
  const lines = [header]
  for (const r of rows) {
    const vals = columns.map(c => {
      const raw = r[c.key]
      let s = ''
      if (Array.isArray(raw)) {
        s = sanitizeTextArray(raw).join('; ')
      } else if (raw !== undefined && raw !== null) {
        s = String(raw)
      }
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return '"' + s.replaceAll('"', '""') + '"'
      }
      return s
    })
    lines.push(vals)
  }
  return lines.map(a => a.join(',')).join('\n')
}

export default function Sheet() {
  const { rows, setRows, loading, clients, clientFilter, setClientFilter, defaultClientId, clientLines } = useNocoDB({
    baseUrl: READ_BASE_URL,
    ALL: ALL_CLIENTS,
  })

  const [selectedIds, setSelectedIds] = React.useState(new Set())
  const [selectionLocked, setSelectionLocked] = React.useState(false)
  // Default client-side sort: celebration date descending (newest first)
  const [sort, setSort] = React.useState({ key: 'id', dir: 'desc' }) // dir: 'asc' | 'desc' | null
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createSaving, setCreateSaving] = React.useState(false)
  const [createForm, setCreateForm] = React.useState({
    company: '',
    fecha: '',
    status: '',
    kdm: '',
    tituloKdm: '',
    industria: '',
    empleados: '',
    score: '',
    feedback: '',
    company_linkedin: '',
    person_linkedin: '',
    web_url: '',
    comments: '',
    AE_mails: '',
    cliente: '',
    lineaNegocio: [],
  })
  const [createErrors, setCreateErrors] = React.useState({})
  // Filters
  const [statusFilter, setStatusFilter] = React.useState('')
  const [scoreFilter, setScoreFilter] = React.useState('') // '' | 'none' | '<score>'
  const [dateFilter, setDateFilter] = React.useState({ label: 'Todo el tiempo', start: null, end: null })
  const [companyQuery, setCompanyQuery] = React.useState('')
  const [pending, setPending] = React.useState(new Set())
  const [briefOpen, setBriefOpen] = React.useState(false)
  const [briefRow, setBriefRow] = React.useState(null)
  const [briefSending, setBriefSending] = React.useState(false)
  const [briefError, setBriefError] = React.useState('')
  const [briefResponse, setBriefResponse] = React.useState('')
  const initialClientRef = React.useRef(true)

  const clientOptions = React.useMemo(() => clients.map(opt => {
    if (typeof opt === 'string') {
      const isAll = opt === ALL_CLIENTS
      return { value: opt, label: isAll ? 'Todos los clientes' : opt, id: null }
    }
    const rawValue = opt?.value ?? opt?.id ?? opt?.label ?? ''
    const value = String(rawValue)
    const label = opt?.label ?? (value === ALL_CLIENTS ? 'Todos los clientes' : value)
    const id = opt?.id != null ? opt.id : (opt?.value != null && /^\d+$/.test(String(opt.value)) ? Number(opt.value) : null)
    return { value, label, id }
  }), [clients])

  const clientFilterOptions = React.useMemo(() => {
    const seen = new Set()
    const opts = []
    for (const opt of clientOptions) {
      if (!opt.value || seen.has(opt.value)) continue
      seen.add(opt.value)
      opts.push(opt)
    }
    return opts
  }, [clientOptions])

  const clientIdMap = React.useMemo(() => {
    const map = new Map()
    for (const opt of clientOptions) {
      const id = opt.id ?? (opt.value && /^\d+$/.test(opt.value) ? Number(opt.value) : null)
      if (opt.value) map.set(opt.value, id)
      if (opt.label) map.set(opt.label, id)
      if (id != null) map.set(String(id), id)
    }
    return map
  }, [clientOptions])

  const resolveClientSelection = React.useCallback((formLabel) => {
    const trimmed = (formLabel ?? '').trim()
    if (trimmed) {
      const byLabel = clientOptions.find(opt => opt.label === trimmed)
      if (byLabel) return { label: byLabel.label, id: byLabel.id ?? clientIdMap.get(byLabel.value) ?? null }
    }
    if (clientFilter) {
      const byValue = clientOptions.find(opt => opt.value === clientFilter)
      if (byValue) return { label: byValue.label, id: byValue.id ?? clientIdMap.get(byValue.value) ?? null }
    }
    if (trimmed) return { label: trimmed, id: clientIdMap.get(trimmed) ?? null }
    return { label: '', id: null }
  }, [clientOptions, clientIdMap, clientFilter])

  const getSelectedClientLabel = React.useCallback(() => {
    if (!clientFilter) return ''
    const opt = clientOptions.find(o => o.value === clientFilter)
    return opt?.label ?? ''
  }, [clientFilter, clientOptions])
  const toggleRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    setSelectedIds(prev => {
      if (!rows.length) return new Set()
      const allSelected = rows.every(r => prev.has(r.id))
      if (allSelected) return new Set()
      const next = new Set(rows.map(r => r.id))
      return next
    })
  }

  const openDuplicate = () => {
    if (selectedIds.size !== 1) return
    const id = Array.from(selectedIds)[0]
    const row = rows.find(r => r.id === id)
    if (!row) return
    const selectedLabel = getSelectedClientLabel()
    setCreateForm({
      company: row.company || '',
      fecha: row.fecha || '',
      status: row.status || '',
      kdm: row.kdm || '',
      tituloKdm: row.tituloKdm || '',
      industria: row.industria || '',
      empleados: row.empleados || '',
      score: row.score === 0 ? 0 : (row.score || ''),
      feedback: row.feedback || '',
      company_linkedin: row.company_linkedin || '',
      person_linkedin: row.person_linkedin || '',
      web_url: row.web_url || '',
      comments: row.comments || '',
      AE_mails: sanitizeTextArray(row.AE_mails || []).join('\n'),
      cliente: (clientFilter === ALL_CLIENTS ? (row.cliente || '') : (selectedLabel || row.cliente || '')),
      lineaNegocio: sanitizeLineaNegocio(row.lineaNegocio || []),
    })
    // Keep current selection, but lock selection changes while the slider is open
    setSelectionLocked(true)
    setCreateOpen(true)
    setCreateErrors({})
  }

  const openBrief = () => {
    if (selectedIds.size !== 1) return
    const id = Array.from(selectedIds)[0]
    const row = rows.find(r => r.id === id)
    if (!row) return
    const selectedLabel = getSelectedClientLabel()
    const briefData = {
      ...row,
      cliente: row.cliente || selectedLabel || '',
      AE_mails: Array.isArray(row.AE_mails) ? row.AE_mails : sanitizeTextArray(row.AE_mails),
    }
    setBriefRow(briefData)
    setBriefOpen(true)
    setSelectionLocked(true)
    const hasEmails = Array.isArray(briefData.AE_mails) ? briefData.AE_mails.length > 0 : Boolean(briefData.AE_mails)
    setBriefError(hasEmails ? '' : 'Falta completar AE mails antes de enviar')
    setBriefResponse('')
  }

  const closeBrief = () => {
    setBriefOpen(false)
    setBriefRow(null)
    setBriefSending(false)
    setBriefError('')
    setSelectionLocked(false)
    setBriefResponse('')
  }

  const addRow = () => {
    // Clear any selection and lock selection while creating
    if (selectedIds.size > 0) setSelectedIds(new Set())
    setSelectionLocked(true)
    // Open slide-over to create new record
    const selectedLabel = getSelectedClientLabel()
    setCreateForm({
      company: '',
      fecha: '',
      status: '',
      kdm: '',
      tituloKdm: '',
      industria: '',
      empleados: '',
      score: '',
      feedback: '',
      company_linkedin: '',
      person_linkedin: '',
      web_url: '',
      comments: '',
      AE_mails: '',
      cliente: selectedLabel,
      lineaNegocio: [],
    })
    setCreateErrors({})
    setCreateOpen(true)
  }

  const updateCell = (id, key, value) => {
    let v = value
    if (key === 'score') {
      v = value === '' || value === null || value === undefined ? '' : Number(value)
      if (!Number.isFinite(v)) v = ''
    } else if (key === 'lineaNegocio') {
      v = sanitizeLineaNegocio(Array.isArray(value) ? value : [])
    } else if (key === 'AE_mails') {
      v = toMailDraftArray(value)
    }
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: v } : r))
  }

  const downloadCSV = () => {
    const csv = toCSV(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'datos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const removeSelected = React.useCallback(async () => {
    if (!selectedIds.size) return
    try {
      setSelectionLocked(true)
      const token = import.meta.env.VITE_NOCODB_TOKEN
      if (!token) {
        toast.error('Falta token de autenticación')
        return
      }
      const rowsToArchive = rows.filter(r => selectedIds.has(r.id))
      const ids = rowsToArchive
        .map(r => (typeof r.recordId === 'number' ? r.recordId : (typeof r.id === 'number' ? r.id : Number(r.recordId))))
        .filter(id => Number.isFinite(id))
      if (ids.length) {
        await archiveNocoRecords(WRITE_BASE_URL, token, ids)
      }
      setRows(prev => prev.filter(r => !selectedIds.has(r.id)))
      setSelectedIds(new Set())
      toast.success('Archivado correctamente')
    } catch (e) {
      console.warn('[REST][ARCHIVE] error', e)
      toast.error(`Error al archivar: ${e?.message || 'fallo'}`)
    } finally {
      setSelectionLocked(false)
    }
  }, [rows, selectedIds])

  React.useEffect(() => {
    if (!clientFilterOptions.length) return
    setClientFilter(current => {
      if (current && clientFilterOptions.some(opt => opt.value === current)) return current
      if (defaultClientId && clientFilterOptions.some(opt => opt.value === defaultClientId)) return defaultClientId
      if (current) return current
      return clientFilterOptions[0]?.value ?? ALL_CLIENTS
    })
  }, [clientFilterOptions, defaultClientId, setClientFilter])

  const statusOptions = React.useMemo(() => {
    const present = new Set()
    for (const row of rows) {
      const val = (row.status ?? '').trim()
      if (val) present.add(val)
    }
    const filtered = STATUS_OPTIONS.filter(opt => present.has(opt))
    return (filtered.length ? filtered : STATUS_OPTIONS).map(opt => ({ value: opt, label: opt }))
  }, [rows])

  const scoreOptions = React.useMemo(() => {
    const numericSet = new Set()
    let hasEmpty = false
    for (const row of rows) {
      const val = row.score
      if (val === '' || val === null || val === undefined) {
        hasEmpty = true
        continue
      }
      const num = Number(val)
      if (Number.isFinite(num)) numericSet.add(num)
    }
    const sorted = Array.from(numericSet).sort((a,b)=>a-b).map(n => String(n))
    return { values: sorted, hasEmpty }
  }, [rows])

  const validateCreateForm = React.useCallback(() => {
    const nextErrors = {}
    for (const field of REQUIRED_FIELDS) {
      const value = createForm[field.key]
      const normalized = typeof value === 'number' ? value : (value ?? '').toString().trim()
      if (normalized === '') {
        nextErrors[field.key] = `${field.label} es obligatorio`
      }
    }
    setCreateErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Completa los campos obligatorios')
      return false
    }
    return true
  }, [createForm])

  // Track last-saved values to avoid PATCH if unchanged
  const lastSaved = React.useRef(new Map())
  const normalize = React.useCallback((key, val) => {
    if (key === 'score') {
      if (val === '' || val === null || val === undefined) return ''
      const n = Number(val)
      return Number.isFinite(n) ? n : val
    }
    if (key === 'lineaNegocio') {
      const sanitized = sanitizeLineaNegocio(Array.isArray(val) ? val : [])
      return JSON.stringify(sanitized)
    }
    if (key === 'AE_mails') {
      const sanitized = sanitizeTextArray(val)
      return JSON.stringify(sanitized)
    }
    return (val ?? '').toString()
  }, [])
  const prevLoading = React.useRef(true)
  React.useEffect(() => {
    // Initialize snapshot only on transition loading: true -> false (post-fetch)
    if (prevLoading.current && !loading) {
      const snap = new Map()
      for (const r of rows) {
        for (const c of columns) {
          snap.set(`${r.id}:${c.key}`, normalize(c.key, r[c.key]))
        }
      }
      console.log('[snapshot] initialized with', snap.size, 'entries')
      lastSaved.current = snap
    }
    prevLoading.current = loading
  }, [loading, rows])

  const handleCellBlur = React.useCallback(async (row, key, value) => {
    const mapKey = `${row.id}:${key}`
    const normVal = normalize(key, value)
    const saved = lastSaved.current.get(mapKey)
    if (saved === normVal) return
    const recordIdRaw = row.recordId ?? row.Id ?? row.id
    const recordId = typeof recordIdRaw === 'number' ? recordIdRaw : Number(recordIdRaw)
    if (!Number.isFinite(recordId)) {
      toast.error('Registro sin Id válido')
      return
    }
    const token = import.meta.env.VITE_NOCODB_TOKEN
    if (!token) {
      toast.error('Falta token de autenticación')
      return
    }
    const baseClientId = row.clientId ?? clientIdMap.get(row.cliente) ?? null
    const payload = {
      company: row.company ?? '',
      client: row.cliente ?? '',
      celebration_date: row.fecha ?? '',
      status: row.status ?? '',
      kdm: row.kdm ?? '',
      kdm_title: row.tituloKdm ?? '',
      industry: row.industria ?? '',
      employers_quantity: row.empleados ?? '',
      score: row.score === '' ? null : (row.score ?? null),
      feedback: row.feedback ?? '',
      company_linkedin: row.company_linkedin ?? '',
      person_linkedin: row.person_linkedin ?? '',
      web_url: row.web_url ?? '',
      comments: row.comments ?? '',
      AE_mails: sanitizeTextArray(row.AE_mails ?? []),
      client_id: baseClientId,
    }
    payload.lineas_negocio_ids = sanitizeLineaNegocio(row.lineaNegocio || [])
    switch (key) {
      case 'company': payload.company = value ?? '' ; break
      case 'cliente': payload.client = value ?? '' ; break
      case 'fecha': payload.celebration_date = value ?? '' ; break
      case 'status': payload.status = value ?? '' ; break
      case 'kdm': payload.kdm = value ?? '' ; break
      case 'tituloKdm': payload.kdm_title = value ?? '' ; break
      case 'industria': payload.industry = value ?? '' ; break
      case 'empleados': payload.employers_quantity = value ?? '' ; break
      case 'score': {
        if (value === '' || value == null) payload.score = null
        else {
          const num = Number(value)
          payload.score = Number.isFinite(num) ? num : null
        }
        break
      }
      case 'feedback': payload.feedback = value ?? '' ; break
      case 'company_linkedin': payload.company_linkedin = value ?? '' ; break
      case 'person_linkedin': payload.person_linkedin = value ?? '' ; break
      case 'web_url': payload.web_url = value ?? '' ; break
      case 'comments': payload.comments = value ?? '' ; break
      case 'AE_mails': payload.AE_mails = sanitizeTextArray(value) ; break
      case 'lineaNegocio': payload.lineas_negocio_ids = sanitizeLineaNegocio(Array.isArray(value) ? value : []) ; break
      default: break
    }
    let clientSelection = resolveClientSelection(payload.client)
    if (!clientSelection.label && row.cliente) {
      clientSelection = { label: row.cliente, id: payload.client_id ?? row.clientId ?? null }
    }
    payload.client = clientSelection.label
    payload.client_id = clientSelection.id
    if (payload.client_id == null && typeof row.clientId === 'number') {
      payload.client_id = row.clientId
    }
    const pendingKey = `${row.id}:${key}`
    try {
      console.log('[Sheet][PATCH][payload]', JSON.stringify(payload, null, 2))
    } catch (e) {
      console.log('[Sheet][PATCH][payload]', payload)
    }
    setPending(prev => new Set(prev).add(pendingKey))
    try {
      await updateNocoRecord(WRITE_BASE_URL, token, recordId, payload)
      lastSaved.current.set(mapKey, normVal)
      toast.success(`Guardado OK (${key})`)
    } catch (e) {
      console.warn('[NocoDB][PATCH] error', e)
      toast.error(`Error (${key}): ${e?.message || 'fallo'}`)
    } finally {
      setPending(prev => {
        const next = new Set(prev)
        next.delete(pendingKey)
        return next
      })
    }
  }, [normalize, clientIdMap])

  // Sync client filter with URL ?client=...
  React.useEffect(() => {
    // On mount, read query param and apply
    const url = new URL(window.location.href)
    const qp = url.searchParams.get('client')
    if (qp && qp !== clientFilter) {
      setClientFilter(qp)
    }
    // no dependencies (run once on mount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    // Reflect current filter into the URL without adding history entries
    const url = new URL(window.location.href)
    if (!clientFilter || clientFilter === ALL_CLIENTS) {
      url.searchParams.delete('client')
    } else {
      url.searchParams.set('client', clientFilter)
    }
    window.history.replaceState({}, '', url.toString())
  }, [clientFilter])

  React.useEffect(() => {
    if (initialClientRef.current) {
      initialClientRef.current = false
      return
    }
    setSelectedIds(new Set())
    setSelectionLocked(false)
  }, [clientFilter])

  // Toasts removed per request

  const filteredRows = useFilteredRows(rows, { status: statusFilter, score: scoreFilter, query: companyQuery, date: dateFilter })
  const sortedRows = useSortedRows(filteredRows, sort)

  const { lineOptionsByClient, lineLabelLookup } = React.useMemo(() => {
    const clientMap = new Map()
    const labelMap = new Map()
    for (const line of clientLines) {
      const keyCandidates = []
      if (line.clientId !== null && line.clientId !== undefined) {
        keyCandidates.push(line.clientId)
        const numeric = Number(line.clientId)
        if (Number.isFinite(numeric)) keyCandidates.push(numeric)
        if (typeof line.clientId === 'string') keyCandidates.push(line.clientId.trim())
      }
      const lineId = line.lineId
      const label = line.label
      if (lineId === null || lineId === undefined || !label) continue
      const normalizedId = Number.isFinite(Number(lineId)) ? Number(lineId) : lineId
      labelMap.set(normalizedId, label)
      labelMap.set(String(normalizedId), label)
      for (const key of keyCandidates) {
        if (key === null || key === undefined || key === '') continue
        if (!clientMap.has(key)) clientMap.set(key, new Map())
        const optionMap = clientMap.get(key)
        if (!optionMap.has(normalizedId)) optionMap.set(normalizedId, { id: normalizedId, label })
      }
    }
    const normalizedClientMap = new Map()
    for (const [key, map] of clientMap.entries()) {
      const list = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
      normalizedClientMap.set(key, list)
      normalizedClientMap.set(String(key), list)
    }
    return { lineOptionsByClient: normalizedClientMap, lineLabelLookup: labelMap }
  }, [clientLines])

  const createClientId = React.useMemo(() => {
    const { id } = resolveClientSelection(createForm.cliente)
    if (id != null) return id
    if (clientFilter && clientFilter !== ALL_CLIENTS) {
      const byValue = clientOptions.find(opt => opt.value === clientFilter)
      if (byValue?.id != null) return byValue.id
      if (/^\d+$/.test(String(clientFilter))) return Number(clientFilter)
    }
    return null
  }, [createForm.cliente, resolveClientSelection, clientFilter, clientOptions])

  const createLineaOptions = React.useMemo(() => {
    const buildList = (list = []) => list.map(opt => ({ id: opt.id, label: opt.label }))
    if (createClientId != null) {
      const candidates = [createClientId, String(createClientId)]
      for (const key of candidates) {
        if (lineOptionsByClient.has(key)) {
          const arr = lineOptionsByClient.get(key)
          if (Array.isArray(arr) && arr.length) return buildList(arr)
        }
      }
    }
    // No client-specific match; aggregate all unique options so the dropdown still opens
    const unique = new Map()
    for (const list of lineOptionsByClient.values()) {
      if (!Array.isArray(list)) continue
      for (const opt of list) {
        if (!opt || opt.id == null) continue
        const key = Number.isFinite(Number(opt.id)) ? Number(opt.id) : opt.id
        if (!unique.has(key)) unique.set(key, { id: key, label: opt.label })
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [createClientId, lineOptionsByClient])

  return (
    <div className="sheet-root">
      <div className="sheet-headerbar">
        <div className="sheet-header-row">
          <ClientFilter large value={clientFilter} options={clientFilterOptions} onChange={setClientFilter} disabled={createOpen} />
          <div className="sheet-header-actions">
            <span className="sheet-count-pill">{filteredRows.length} registros</span>
            <Button onClick={addRow} className="bg-black text-white hover:bg-neutral-900">Agregar fila</Button>
          </div>
        </div>
        <div className="sheet-header-row sheet-header-row--filters">
          <div className="sheet-header-filters">
            <label className="sheet-filter-field">
              <span>Company:</span>
              <Input
                placeholder="Buscar (fuzzy)"
                style={{ width: 260 }}
                value={companyQuery}
                onChange={e => setCompanyQuery(e.target.value)}
                disabled={createOpen}
              />
            </label>
            <label className="sheet-filter-field">
              <span>Status:</span>
              <select
                className="client-title-trigger status-filter-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                disabled={createOpen}
              >
                <option value="">Todos</option>
                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label className="sheet-filter-field">
              <span>Score:</span>
              <select
                className="client-title-trigger status-filter-select"
                value={scoreFilter}
                onChange={e => setScoreFilter(e.target.value)}
                disabled={createOpen}
              >
                <option value="">Todos</option>
                {scoreOptions.hasEmpty && <option value="none">Sin score</option>}
                {scoreOptions.values.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </label>
            <div className="sheet-filter-field">
              <span>Fecha:</span>
              <DateFilter value={dateFilter} onChange={setDateFilter} disabled={createOpen} />
            </div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        {selectedIds.size === 1 && (
          <Button variant="secondary" onClick={openDuplicate}>Duplicar</Button>
        )}
        {selectedIds.size === 1 && (
          <Button variant="outline" onClick={openBrief} disabled={selectionLocked}>Enviar brief</Button>
        )}
        {selectedIds.size > 0 && (
          <Button variant="default" className="bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-100/80" onClick={removeSelected} disabled={selectionLocked}>
            Eliminar seleccionados ({selectedIds.size})
          </Button>
        )}
      </div>

      <SheetTable
        columns={columns}
        rows={sortedRows}
        loading={loading}
        onCellChange={updateCell}
        onCellBlur={handleCellBlur}
        onCellClick={row => {
          try {
            console.log('[cell-click]', JSON.stringify(row, null, 2))
          } catch {
            console.log('[cell-click]', row)
          }
        }}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        disableSelection={selectionLocked}
        sort={sort}
        onToggleSort={(key) => setSort(prev => {
          if (!prev.key || prev.key !== key) return { key, dir: 'asc' }
          if (prev.dir === 'asc') return { key, dir: 'desc' }
          return { key: null, dir: null }
        })}
        pending={pending}
        clientLineMap={lineOptionsByClient}
        lineLabelLookup={lineLabelLookup}
      />
      <Toaster position="top-right" toastOptions={{ duration: 2000 }} />

      {createOpen && (
        <CreateSlide
          values={createForm}
          errors={createErrors}
          requiredFields={REQUIRED_FIELDS.map(f => f.key)}
          lineaOptions={createLineaOptions}
          onChange={(key, val) => {
            setCreateForm(v => ({ ...v, [key]: val }))
            setCreateErrors(prev => {
              if (!prev[key]) return prev
              const next = { ...prev }
              delete next[key]
              return next
            })
          }}
          onCancel={() => { setCreateOpen(false); setSelectionLocked(false); setCreateErrors({}) }}
          onSave={async () => {
            if (!validateCreateForm()) return
            try {
              setCreateSaving(true)
              const token = import.meta.env.VITE_NOCODB_TOKEN
              const baseUrl = WRITE_BASE_URL
              const { label: resolvedLabel, id: resolvedId } = resolveClientSelection(createForm.cliente)
              if (!resolvedLabel) {
                toast.error('Selecciona un cliente antes de guardar')
                return
              }
              if (resolvedId == null) {
                toast.error('No se encontró el client_id para el cliente seleccionado')
                return
              }
              const payload = {
                company: createForm.company,
                celebration_date: createForm.fecha,
                status: createForm.status,
                kdm: createForm.kdm,
                kdm_title: createForm.tituloKdm,
                industry: createForm.industria,
                employers_quantity: createForm.empleados,
                score: createForm.score === '' ? null : Number(createForm.score),
                feedback: createForm.feedback,
                company_linkedin: createForm.company_linkedin,
                person_linkedin: createForm.person_linkedin,
                web_url: createForm.web_url,
                comments: createForm.comments,
                AE_mails: sanitizeTextArray(createForm.AE_mails),
                client: resolvedLabel,
                client_id: resolvedId,
                lineas_negocio_ids: sanitizeLineaNegocio(createForm.lineaNegocio || []),
                archived: false,
              }
              const sanitizedPayload = { ...payload }
              delete sanitizedPayload.id
              delete sanitizedPayload.recordId
              delete sanitizedPayload.record_id
              console.log('[Sheet][CREATE][payload]', JSON.stringify(sanitizedPayload, null, 2))
              const rec = await createNocoRecord(baseUrl, token, sanitizedPayload)
              const row = mapRecordToRow(rec ?? { ...sanitizedPayload, id: null })
              setRows(prev => [row, ...prev])
              // clear any selection after successful create
              setSelectedIds(new Set())
              // update snapshot for new row
              const snap = lastSaved.current
              for (const c of columns) snap.set(`${row.id}:${c.key}`, normalize(c.key, row[c.key]))
              toast.success('Creado OK')
              setCreateOpen(false)
              setSelectionLocked(false)
              setCreateErrors({})
              setCreateForm({
                company: '',
                fecha: '',
                status: '',
                kdm: '',
                tituloKdm: '',
                industria: '',
                empleados: '',
                score: '',
                feedback: '',
                company_linkedin: '',
                person_linkedin: '',
                web_url: '',
                comments: '',
                AE_mails: '',
                cliente: '',
                lineaNegocio: [],
              })
            } catch (e) {
              toast.error(`Error al crear: ${e.message}`)
            } finally {
              setCreateSaving(false)
            }
          }}
          saving={createSaving}
        />
      )}
      <BriefDialog
        open={briefOpen}
        row={briefRow}
        fields={BRIEF_FIELDS}
        sending={briefSending}
        error={briefError}
        responseMessage={briefResponse}
        onClose={closeBrief}
        onConfirm={async () => {
          if (!briefRow) return
          const emails = Array.isArray(briefRow.AE_mails) ? briefRow.AE_mails : normalizeTextArray(briefRow.AE_mails)
          if (!emails.length) {
            setBriefError('Falta completar AE mails antes de enviar')
            return
          }
          const { id: resolvedClientId } = resolveClientSelection(briefRow.cliente)
          let briefClientId = resolvedClientId ?? null
          if (briefClientId == null) {
            if (typeof briefRow.clientId === 'number') {
              briefClientId = briefRow.clientId
            } else if (typeof briefRow.clientId === 'string' && /^\d+$/.test(briefRow.clientId.trim())) {
              briefClientId = Number(briefRow.clientId.trim())
            } else {
              const mappedId = clientIdMap.get(briefRow.cliente)
              if (mappedId != null) briefClientId = mappedId
            }
          }
          const payload = {
            recordId: briefRow.recordId ?? briefRow.id ?? null,
            company: briefRow.company ?? '',
            cliente: briefRow.cliente ?? '',
            fecha: briefRow.fecha ?? '',
            status: briefRow.status ?? '',
            kdm: briefRow.kdm ?? '',
            tituloKdm: briefRow.tituloKdm ?? '',
            industria: briefRow.industria ?? '',
            empleados: briefRow.empleados ?? '',
            score: briefRow.score ?? '',
            feedback: briefRow.feedback ?? '',
            company_linkedin: briefRow.company_linkedin ?? '',
            person_linkedin: briefRow.person_linkedin ?? '',
            web_url: briefRow.web_url ?? '',
            comments: briefRow.comments ?? '',
            ae_mails: emails,
            lineaNegocio: Array.isArray(briefRow.lineaNegocio) ? briefRow.lineaNegocio : [],
            client_id: briefClientId,
            timestamp: new Date().toISOString(),
          }
          try {
            setBriefSending(true)
            setBriefError('')
            setBriefResponse('')
            const res = await fetch(BRIEF_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            if (!res.ok) {
              let info = ''
              try { info = await res.text() } catch {}
              throw new Error(info || `HTTP ${res.status}`)
            }
            try {
              const text = await res.text()
              console.log('[Brief][POST] response', text)
              setBriefResponse(text || 'Brief enviado correctamente.')
            } catch (e) {
              console.log('[Brief][POST] response unreadable', e)
              setBriefResponse('Brief enviado correctamente.')
            }
            toast.success(`Brief enviado para ${briefRow.company || 'registro'}`)
          } catch (err) {
            console.warn('[Brief][POST] error', err)
            setBriefError(`No se pudo enviar el brief: ${err?.message || 'fallo'}`)
            setBriefResponse('')
          } finally {
            setBriefSending(false)
          }
        }}
      />
    </div>
  )
}

function useSortedRows(rows, sort) {
  return React.useMemo(() => {
    if (!sort?.key || !sort?.dir) return rows
    const { key, dir } = sort
    const copy = [...rows]
    copy.sort((a, b) => {
      let va = a[key]
      let vb = b[key]
      if (key === 'score') {
        va = Number.isFinite(va) ? va : -Infinity
        vb = Number.isFinite(vb) ? vb : -Infinity
        return (va - vb) * (dir === 'asc' ? 1 : -1)
      }
      if (key === 'id') {
        const va = Number.isFinite(a.id) ? a.id : -Infinity
        const vb = Number.isFinite(b.id) ? b.id : -Infinity
        return (va - vb) * (dir === 'asc' ? 1 : -1)
      }
      const sa = (va ?? '').toString()
      const sb = (vb ?? '').toString()
      return sa.localeCompare(sb) * (dir === 'asc' ? 1 : -1)
    })
    return copy
  }, [rows, sort])
}

function useFilteredRows(rows, { status, score, query, date }) {
  return React.useMemo(() => {
    const q = (query || '').trim()
    const hasQ = q.length > 0
    const norm = (s) => (s ?? '').toString().toLowerCase()
    const stripAccents = (s) => s.normalize ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '') : s
    const normalized = (s) => stripAccents(norm(s))
    const isSubseq = (needle, hay) => {
      let i = 0
      for (let j = 0; j < hay.length && i < needle.length; j++) {
        if (hay[j] === needle[i]) i++
      }
      return i === needle.length
    }
    const fuzzy = (needle, hay) => {
      const n = normalized(needle)
      const h = normalized(hay)
      if (!n) return true
      // tokens must each be subsequence
      const tokens = n.split(/\s+/).filter(Boolean)
      return tokens.every(t => h.includes(t) || isSubseq(t, h))
    }
    const hasDate = Boolean(date?.start || date?.end)
    const startDate = date?.start ? new Date(`${date.start}T00:00:00`) : null
    const endDate = date?.end ? new Date(`${date.end}T23:59:59`) : null

    return rows.filter(r => {
      if (status && r.status !== status) return false
      // score filter
      if (score) {
        if (score === 'none') {
          if (!(r.score === '' || r.score === null || r.score === undefined)) return false
        } else {
          const sel = Number(score)
          const rowVal = r.score
          const numericScore = rowVal === '' || rowVal == null ? null : Number(rowVal)
          if (!Number.isFinite(numericScore) || numericScore !== sel) return false
        }
      }
      if (hasDate) {
        if (!r.fecha) return false
        const rowDate = new Date(`${r.fecha}T00:00:00`)
        if (startDate && rowDate < startDate) return false
        if (endDate && rowDate > endDate) return false
      }
      if (hasQ && !fuzzy(q, r.company || '')) return false
      return true
    })
  }, [rows, status, score, query, date?.start, date?.end])
}
