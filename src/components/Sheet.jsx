import React from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import ClientFilter from './ClientFilter'
import SheetTable from './SheetTable'
import { useNocoDB } from '../hooks/useNocoDB'
import { COLUMNS as columns, ALL_CLIENTS, STATUS_OPTIONS } from '../constants/sheet'
import { createNocoRecord, mapRecordToRow } from '../services/nocodb'
import CreateSlide from './CreateSlide'

const newId = () => `${Date.now()}_${Math.random().toString(36).slice(2,8)}`

function toCSV(rows) {
  const header = columns.map(c => c.label)
  const lines = [header]
  for (const r of rows) {
    const vals = columns.map(c => {
      const v = r[c.key] ?? ''
      const s = String(v)
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
  const { rows, setRows, loading, clients, clientFilter, setClientFilter, updateRemoteCell, pending } = useNocoDB({
    baseUrl: 'https://nocodb.wearesiete.com/api/v2/tables/mou2qt44g8tdxph/records',
    viewId: 'vwrsh3l1tczjs0hl',
    ALL: ALL_CLIENTS,
  })

  const [selectedIds, setSelectedIds] = React.useState(new Set())
  const [selectionLocked, setSelectionLocked] = React.useState(false)
  // Default client-side sort: celebration date (fecha) descending (newest first)
  const [sort, setSort] = React.useState({ key: 'fecha', dir: 'desc' }) // dir: 'asc' | 'desc' | null
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createSaving, setCreateSaving] = React.useState(false)
  const [createForm, setCreateForm] = React.useState({
    company: '', fecha: '', status: '', kdm: '', tituloKdm: '', industria: '', empleados: '', score: '', feedback: '', cliente: ''
  })
  // Filters
  const [statusFilter, setStatusFilter] = React.useState('')
  const [scoreFilter, setScoreFilter] = React.useState('') // '' | 'none' | '0'..'10'
  const [companyQuery, setCompanyQuery] = React.useState('')
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
      cliente: (clientFilter === ALL_CLIENTS ? (row.cliente || '') : clientFilter)
    })
    // Keep current selection, but lock selection changes while the slider is open
    setSelectionLocked(true)
    setCreateOpen(true)
  }

  const addRow = () => {
    // Clear any selection and lock selection while creating
    if (selectedIds.size > 0) setSelectedIds(new Set())
    setSelectionLocked(true)
    // Open slide-over to create new record
    setCreateForm({ company: '', fecha: '', status: '', kdm: '', tituloKdm: '', industria: '', empleados: '', score: '', feedback: '', cliente: (clientFilter === ALL_CLIENTS ? '' : clientFilter) })
    setCreateOpen(true)
  }

  const updateCell = (id, key, value) => {
    const v = key === 'score' && value !== '' ? Number(value) : value
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

  const removeSelected = () => {
    setRows(prev => prev.filter(r => !selectedIds.has(r.id)))
    setSelectedIds(new Set())
  }

  // Toasts
  const [toasts, setToasts] = React.useState([])
  const enqueueToast = (msg) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2000)
  }

  // Track last-saved values to avoid PATCH if unchanged
  const lastSaved = React.useRef(new Map())
  const normalize = React.useCallback((key, val) => {
    if (key === 'score') {
      if (val === '' || val === null || val === undefined) return ''
      const n = Number(val)
      return Number.isFinite(n) ? n : val
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

  // Toasts removed per request

  return (
    <div className="sheet-root">
      <div className="sheet-headerbar" style={{marginBottom: 4, display:'flex', flexDirection:'column', gap:8}}>
        <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', justifyContent:'space-between', width:'100%'}}>
          <ClientFilter large value={clientFilter} options={[ALL_CLIENTS, ...clients]} onChange={setClientFilter} disabled={createOpen} />
        </div>
        <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', justifyContent:'space-between', width:'100%'}}>
          <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontWeight:700}}>Company:</span>
              <Input placeholder="Buscar (fuzzy)" style={{width:260}} value={companyQuery} onChange={e=>setCompanyQuery(e.target.value)} disabled={createOpen} />
            </label>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontWeight:700}}>Status:</span>
              <select
                className="client-title-trigger"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                disabled={createOpen}
              >
                <option value="">Todos</option>
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </label>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontWeight:700}}>Score:</span>
              <select
                className="client-title-trigger"
                value={scoreFilter}
                onChange={e => setScoreFilter(e.target.value)}
                disabled={createOpen}
              >
                <option value="">Todos</option>
                <option value="none">Sin score</option>
                {Array.from({length: 11}).map((_,n)=>(<option key={n} value={String(n)}>{n}</option>))}
              </select>
            </label>
          </div>
          <div>
            <Button onClick={addRow} className="bg-black text-white hover:bg-neutral-900">Agregar fila</Button>
          </div>
        </div>
      </div>

      <div className="toolbar">
        {selectedIds.size === 1 && (
          <Button variant="secondary" onClick={openDuplicate}>Duplicar</Button>
        )}
        {selectedIds.size > 0 && (
          <Button variant="default" className="bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-100/80" onClick={removeSelected}>
            Eliminar seleccionados ({selectedIds.size})
          </Button>
        )}
      </div>

      <SheetTable
        columns={columns}
        rows={useSortedRows(useFilteredRows(rows, { status: statusFilter, score: scoreFilter, query: companyQuery }), sort)}
        loading={loading}
        onCellChange={updateCell}
        onCellBlur={async (id, key, value) => {
          const mapKey = `${id}:${key}`
          const saved = lastSaved.current.get(mapKey)
          const normVal = normalize(key, value)
          if (saved === normVal) return // no cambios
          const res = await updateRemoteCell(id, key, value)
          if (res?.ok) {
            lastSaved.current.set(mapKey, normVal)
            enqueueToast(`Guardado OK (${key})`)
          } else {
            enqueueToast(`Error (${key}): ${res?.error?.message || 'fallo'}`)
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
      />
      <ToastContainer toasts={toasts} />

      {createOpen && (
        <CreateSlide
          values={createForm}
          onChange={(key, val) => setCreateForm(v => ({ ...v, [key]: val }))}
          onCancel={() => { setCreateOpen(false); setSelectionLocked(false) }}
          onSave={async () => {
            try {
              setCreateSaving(true)
              const token = import.meta.env.VITE_NOCODB_TOKEN
              const baseUrl = 'https://nocodb.wearesiete.com/api/v2/tables/mou2qt44g8tdxph/records'
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
                client: createForm.cliente || (clientFilter === ALL_CLIENTS ? '' : clientFilter),
              }
              const rec = await createNocoRecord(baseUrl, token, payload)
              const merged = { ...(payload || {}), ...(rec || {}) }
              merged.Id = rec?.Id ?? rec?.id ?? merged.Id
              merged.id = rec?.id ?? rec?.Id ?? merged.id
              const row = mapRecordToRow(merged)
              setRows(prev => [row, ...prev])
              // clear any selection after successful create
              setSelectedIds(new Set())
              // update snapshot for new row
              const snap = lastSaved.current
              for (const c of columns) snap.set(`${row.id}:${c.key}`, row[c.key] ?? '')
              enqueueToast('Creado OK')
              setCreateOpen(false)
              setSelectionLocked(false)
            } catch (e) {
              enqueueToast(`Error al crear: ${e.message}`)
            } finally {
              setCreateSaving(false)
            }
          }}
          onSaveAnother={async () => {
            try {
              setCreateSaving(true)
              const token = import.meta.env.VITE_NOCODB_TOKEN
              const baseUrl = 'https://nocodb.wearesiete.com/api/v2/tables/mou2qt44g8tdxph/records'
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
                client: createForm.cliente || (clientFilter === ALL_CLIENTS ? '' : clientFilter),
              }
              const rec = await createNocoRecord(baseUrl, token, payload)
              const merged = { ...(payload || {}), ...(rec || {}) }
              merged.Id = rec?.Id ?? rec?.id ?? merged.Id
              merged.id = rec?.id ?? rec?.Id ?? merged.id
              const row = mapRecordToRow(merged)
              setRows(prev => [row, ...prev])
              // clear any selection after successful create-another
              setSelectedIds(new Set())
              const snap = lastSaved.current
              for (const c of columns) snap.set(`${row.id}:${c.key}`, row[c.key] ?? '')
              enqueueToast('Creado OK')
              // reset form for next creation (preserve cliente)
              setCreateForm({ company: '', fecha: '', status: '', kdm: '', tituloKdm: '', industria: '', empleados: '', score: '', feedback: '', cliente: createForm.cliente })
            } catch (e) {
              enqueueToast(`Error al crear: ${e.message}`)
            } finally {
              setCreateSaving(false)
            }
          }}
          saving={createSaving}
        />
      )}
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
      // handle numeric for score
      if (key === 'score') {
        va = Number.isFinite(va) ? va : -Infinity
        vb = Number.isFinite(vb) ? vb : -Infinity
        return (va - vb) * (dir === 'asc' ? 1 : -1)
      }
      // fecha stored as yyyy-MM-dd, lexicographic compare is fine
      const sa = (va ?? '').toString()
      const sb = (vb ?? '').toString()
      return sa.localeCompare(sb) * (dir === 'asc' ? 1 : -1)
    })
    return copy
  }, [rows, sort])
}

function useFilteredRows(rows, { status, score, query }) {
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
    return rows.filter(r => {
      if (status && r.status !== status) return false
      // score filter
      if (score) {
        if (score === 'none') {
          if (!(r.score === '' || r.score === null || r.score === undefined)) return false
        } else {
          const sel = Number(score)
          const sv = Number.isFinite(r.score) ? r.score : (r.score === 0 ? 0 : null)
          if (sv == null || sv !== sel) return false
        }
      }
      if (hasQ && !fuzzy(q, r.company || '')) return false
      return true
    })
  }, [rows, status, score, query])
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast">{t.msg}</div>
      ))}
    </div>
  )
}

//

// CreateSlide moved to its own component
