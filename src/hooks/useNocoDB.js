import { useEffect, useMemo, useState } from 'react'
import { buildNocoUrl, mapRecordToRow } from '../services/nocodb'

const CLIENTS_URL = 'https://rest.wearesiete.com/clientes'
const CLIENT_LINES_URL = 'https://rest.wearesiete.com/clientes_lineas_negocio'
const DEFAULT_CLIENT_ID = '46'

export function useNocoDB({ baseUrl, ALL }) {
  const token = import.meta.env.VITE_NOCODB_TOKEN
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(!!token)
  const [error, setError] = useState(null)
  const [clientFilter, setClientFilter] = useState(DEFAULT_CLIENT_ID)
  const [allClients, setAllClients] = useState([])
  const [clientLines, setClientLines] = useState([])

  useEffect(() => {
    if (!token) { setLoading(false); return }
    const controller = new AbortController()
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const url = buildNocoUrl(baseUrl, { clientFilter, ALL })
        const headers = { 'Accept-Profile': 'prospection' }
        console.log('[REST][GET] request', {
          url: url.toString(),
          params: Object.fromEntries(url.searchParams.entries()),
          headers,
        })
        const res = await fetch(url.toString(), { headers, signal: controller.signal })
        console.log('[REST][GET] status', res.status, 'ok', res.ok)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json().catch(() => [])
        console.log('[REST][GET] response', data)
        const list = Array.isArray(data) ? data : []
        const mapped = list.map(mapRecordToRow)
        setRows(mapped)
      } catch (e) {
        setError(e)
        setRows([])
      } finally { setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [baseUrl, clientFilter, token, ALL])

  const clients = useMemo(() => allClients, [allClients])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const loadClients = async () => {
      try {
        const headers = { 'Accept-Profile': 'core' }
        console.log('[REST][CLIENTS][GET] request', { url: CLIENTS_URL, headers })
        const res = await fetch(CLIENTS_URL, { headers, signal: controller.signal })
        if (!res.ok) return
        const data = await res.json().catch(() => [])
        console.log('[REST][CLIENTS][GET] response', data)
        const list = Array.isArray(data) ? data : []
        const map = new Map()
        for (const rec of list) {
          const label = rec.cliente ?? rec.nombre ?? rec.name ?? ''
          const id = rec.id ?? rec.Id ?? rec.client_id ?? null
          const value = id != null ? String(id) : label
          if (!value || map.has(value)) continue
          map.set(value, { value, label: label || value, id: id != null ? Number(id) : null })
        }
        const options = Array.from(map.values()).sort((a,b)=>a.label.localeCompare(b.label))
        if (options.length) setAllClients(options)
      } catch {}
    }
    loadClients()
    return () => controller.abort()
  }, [baseUrl, token, ALL])

  useEffect(() => {
    if (!token || !clientFilter) return
    const controller = new AbortController()
    const fetchLines = async () => {
      try {
        const headers = { 'Accept-Profile': 'core' }
        const url = new URL(CLIENT_LINES_URL)
        const numericId = Number(clientFilter)
        if (Number.isFinite(numericId)) url.searchParams.set('client_id', `eq.${numericId}`)
        console.log('[REST][CLIENT-LINES][GET] request', { url: url.toString(), headers })
        const res = await fetch(url.toString(), { headers, signal: controller.signal })
        if (!res.ok) return
        const data = await res.json().catch(() => [])
        console.log('[REST][CLIENT-LINES][GET] response', data)
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
            return {
              clientId,
              lineId,
              label: label ? String(label) : '',
            }
          })
          .filter(entry => (entry.clientId !== null && entry.clientId !== undefined) && entry.lineId !== null && entry.lineId !== undefined && entry.label)
        setClientLines(normalized)
      } catch (e) {
        console.warn('[REST][CLIENT-LINES][GET] error', e)
        setClientLines([])
      }
    }
    fetchLines()
    return () => controller.abort()
  }, [clientFilter, token])

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
  }
}
