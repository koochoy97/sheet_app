import { useEffect, useMemo, useState } from 'react'
import { buildMeetingsUrl, buildClientsUrl, buildClientLinesUrl, buildClientIcpUrl, mapRecordToRow } from '../services/nocodb'

const API_KEY = import.meta.env.VITE_SIETE_API_KEY
const DEFAULT_CLIENT_ID = '46'

const toContactString = (value) => {
  if (Array.isArray(value)) {
    return value.map(item => (item == null ? '' : String(item).trim())).filter(Boolean).join(', ')
  }
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const extractClientContacts = (record) => {
  if (!record || typeof record !== 'object') {
    return { sdr: '', sdrMail: '', teamLead: '', teamLeadMail: '', hasContactData: false }
  }

  const sdr = toContactString(record['SDR'] ?? record['sdr'] ?? '')
  const sdrMail = toContactString(record['SDR Mail'] ?? record['sdr_mail'] ?? '')
  const teamLead = toContactString(record['Team Lead'] ?? record['team_lead'] ?? '')
  const teamLeadMail = toContactString(record['Team Lead Mail'] ?? record['team_lead_mail'] ?? '')

  return {
    sdr,
    sdrMail,
    teamLead,
    teamLeadMail,
    hasContactData: Boolean(sdr || sdrMail || teamLead || teamLeadMail),
  }
}

export function useNocoDB({ ALL }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(!!API_KEY)
  const [error, setError] = useState(null)
  const [clientFilter, setClientFilter] = useState(DEFAULT_CLIENT_ID)
  const [allClients, setAllClients] = useState([])
  const [clientLines, setClientLines] = useState([])
  const [clientIcps, setClientIcps] = useState([])

  // Fetch meetings
  useEffect(() => {
    if (!API_KEY) { setLoading(false); return }
    const controller = new AbortController()
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const url = buildMeetingsUrl({ clientFilter, ALL })
        const res = await fetch(url.toString(), {
          headers: { 'x-api-key': API_KEY },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json().catch(() => [])
        const list = Array.isArray(data) ? data : []
        // Filter client-side since backend 500s on BIGINT/BOOLEAN filters
        const filtered = list.filter(rec => {
          if (rec.archived) return false
          if (clientFilter && clientFilter !== ALL) {
            const numericFilter = Number(clientFilter)
            if (Number.isFinite(numericFilter) && rec.client_id !== numericFilter) return false
          }
          return true
        })
        setRows(filtered.map(mapRecordToRow))
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError(e)
          setRows([])
        }
      } finally { setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [clientFilter, ALL])

  const clients = useMemo(() => allClients, [allClients])

  // Fetch clients
  useEffect(() => {
    if (!API_KEY) return
    const controller = new AbortController()
    const loadClients = async () => {
      try {
        const url = buildClientsUrl()
        const res = await fetch(url.toString(), {
          headers: { 'x-api-key': API_KEY },
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json().catch(() => [])
        const list = Array.isArray(data) ? data : []
        const map = new Map()
        for (const rec of list) {
          const label = rec.cliente ?? rec.nombre ?? rec.name ?? ''
          const id = rec.id ?? rec.Id ?? rec.client_id ?? null
          const value = id != null ? String(id) : label
          if (!value || map.has(value)) continue
          const meta = extractClientContacts(rec)
          const numericId = Number(id)
          map.set(value, {
            value,
            label: label || value,
            id: id != null && Number.isFinite(numericId) ? numericId : null,
            meta,
          })
        }
        const options = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
        if (options.length) setAllClients(options)
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('[clients] fetch error', e.message)
        }
      }
    }
    loadClients()
    return () => controller.abort()
  }, [ALL])

  // Fetch client lines
  useEffect(() => {
    if (!API_KEY || !clientFilter) return
    const controller = new AbortController()
    const fetchLines = async () => {
      try {
        const url = buildClientLinesUrl(clientFilter)
        const res = await fetch(url.toString(), {
          headers: { 'x-api-key': API_KEY },
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json().catch(() => [])
        const list = Array.isArray(data) ? data : []
        const normalized = list
          .map(line => {
            const rawClientId = line.client_id ?? line.cliente_id ?? line.clientId ?? line.clienteId ?? null
            const numericClientId = Number(rawClientId)
            const clientId = Number.isFinite(numericClientId) ? numericClientId : (rawClientId ?? null)
            const rawLineId = line.linea_negocio_id ?? line.linea_id ?? line.line_id ?? line.lineId ?? line.id ?? line.Id ?? null
            const numericLineId = Number(rawLineId)
            const lineId = Number.isFinite(numericLineId) ? numericLineId : (rawLineId ?? null)
            const label = line.linea_negocio ?? line.nombre ?? line.name ?? line.label ?? ''
            return { clientId, lineId, label: label ? String(label) : '' }
          })
          .filter(entry => entry.clientId != null && entry.lineId != null && entry.label)
        setClientLines(normalized)
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('[client-lines] fetch error', e.message)
          setClientLines([])
        }
      }
    }
    fetchLines()
    return () => controller.abort()
  }, [clientFilter])

  // Fetch client ICPs
  useEffect(() => {
    if (!API_KEY || !clientFilter || clientFilter === ALL) {
      setClientIcps([])
      return
    }
    const controller = new AbortController()
    const fetchIcps = async () => {
      try {
        const url = buildClientIcpUrl(clientFilter)
        const res = await fetch(url.toString(), {
          headers: { 'x-api-key': API_KEY },
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json().catch(() => [])
        const list = Array.isArray(data) ? data : []
        const normalized = list
          .map(icp => {
            const raw = icp.icp_description ?? icp.descripcion ?? icp.description ?? ''
            const pipeIdx = raw.indexOf(' | ')
            const nombre = icp.nombre ?? icp.name ?? (pipeIdx !== -1 ? raw.slice(0, pipeIdx).trim() : raw.trim())
            const afterNombre = pipeIdx !== -1 ? raw.slice(pipeIdx + 3).trim() : ''
            const secondPipe = afterNombre.indexOf(' | ')
            const firstSegment = secondPipe !== -1 ? afterNombre.slice(0, secondPipe).trim() : afterNombre
            const METADATA_KEYS = /^(Industrias|Países|Países|Empleados|Seniority|Títulos|Títulos|Países):/i
            const short_description = METADATA_KEYS.test(firstSegment) ? '' : firstSegment
            return {
              id: icp.id ?? icp.Id ?? null,
              nombre,
              short_description,
              icp_description: afterNombre,
              metadata: icp.metadata ?? null,
            }
          })
          .filter(icp => icp.id != null && icp.nombre)
        setClientIcps(normalized)
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('[client-icps] fetch error', e.message)
          setClientIcps([])
        }
      }
    }
    fetchIcps()
    return () => controller.abort()
  }, [clientFilter, ALL])

  return {
    rows,
    setRows,
    loading,
    error,
    clients,
    clientFilter,
    setClientFilter,
    defaultClientId: DEFAULT_CLIENT_ID,
    clientLines,
    clientIcps,
  }
}
