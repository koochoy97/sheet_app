const API_KEY = import.meta.env.VITE_SIETE_API_KEY
const BASE_URL = import.meta.env.VITE_SIETE_API_URL || 'https://apirest.wearesiete.com'

function apiHeaders() {
  return {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  }
}

export function buildMeetingsUrl({ clientFilter, ALL } = {}) {
  const u = new URL(`${BASE_URL}/prospection/siete_service_meetings/`)
  // Filtering by BIGINT/BOOLEAN columns via query params causes 500 on the backend,
  // so we only use TEXT-safe filters here and filter the rest client-side.
  u.searchParams.set('order_by', 'id')
  u.searchParams.set('order', 'desc')
  u.searchParams.set('limit', '5000')
  return u
}

export function buildClientsUrl() {
  const u = new URL(`${BASE_URL}/core/clientes/`)
  u.searchParams.set('status.neq', 'archived')
  u.searchParams.set('fields', 'id,cliente,status,SDR,SDR Mail,Team Lead,Team Lead Mail')
  u.searchParams.set('order_by', 'cliente')
  u.searchParams.set('order', 'asc')
  u.searchParams.set('limit', '500')
  return u
}

export function buildClientIcpUrl(clientId) {
  const u = new URL(`${BASE_URL}/core/clientes_icp/`)
  const numericId = Number(clientId)
  if (Number.isFinite(numericId)) {
    u.searchParams.set('client_id', String(numericId))
  }
  u.searchParams.set('limit', '500')
  return u
}

export function buildClientLinesUrl(clientFilter) {
  const u = new URL(`${BASE_URL}/core/clientes_lineas_negocio/`)
  const numericId = Number(clientFilter)
  if (Number.isFinite(numericId)) {
    u.searchParams.set('client_id', String(numericId))
  }
  u.searchParams.set('limit', '500')
  return u
}

export function mapRecordToRow(rec) {
  const rawId = rec?.Id ?? rec?.id
  const recordId = rawId == null ? null : Number(rawId)
  const rowId = Number.isFinite(recordId) ? recordId : `api_${cryptoRandom()}`
  const rawClientId = rec?.client_id ?? null
  const numericClientId = Number(rawClientId)
  const clientId = Number.isFinite(numericClientId) ? numericClientId : (rawClientId ?? null)
  const lineaNegocio = normalizeLineaNegocio(
    rec?.lineas_negocio_ids ??
    rec?.lineas_negocio ??
    rec?.linea_negocio ?? []
  )
  const aeMails = normalizeTextArray(
    rec?.AE_mails ??
    rec?.ae_mails ??
    rec?.aeMails ??
    rec?.aeMailsArray ??
    rec?.ae ?? []
  )
  return {
    id: rowId,
    recordId: Number.isFinite(recordId) ? recordId : null,
    clientId,
    company: rec.company ?? '',
    fecha: rec.celebration_date ?? '',
    status: rec.status ?? '',
    kdm: rec.kdm ?? '',
    kdm_mail: rec.kdm_mail ?? rec.kdmMail ?? rec.mail_kdm ?? '',
    telefono_cliente: rec.telefono_cliente ?? rec.telefonoCliente ?? rec.client_phone ?? rec.phone_cliente ?? '',
    tituloKdm: rec.kdm_title ?? '',
    industria: rec.industry ?? '',
    empleados: rec.employers_quantity ?? '',
    score: typeof rec.score === 'number' ? rec.score : (rec.score ?? ''),
    feedback: rec.feedback ?? '',
    company_linkedin: rec.company_linkedin ?? rec.companyLinkedin ?? '',
    person_linkedin: rec.person_linkedin ?? rec.personLinkedin ?? '',
    web_url: rec.web_url ?? rec.webUrl ?? '',
    comments: rec.comments ?? rec.comment ?? '',
    icp_id: rec.icp_id ?? rec.icpId ?? null,
    AE_mails: aeMails,
    archived: Boolean(rec.archived ?? rec.Archived ?? false),
    cliente: rec.client ?? '',
    lineaNegocio,
    created_at: rec?.created_at ?? rec?.createdAt ?? '',
  }
}

function cryptoRandom() {
  try {
    return Math.random().toString(36).slice(2, 10)
  } catch {
    return Date.now().toString(36)
  }
}

function normalizeLineaNegocio(value) {
  if (Array.isArray(value)) {
    const seen = new Set()
    const list = []
    for (const item of value) {
      const num = Number(item)
      if (!Number.isFinite(num)) continue
      if (seen.has(num)) continue
      seen.add(num)
      list.push(num)
    }
    list.sort((a, b) => a - b)
    return list
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return normalizeLineaNegocio(parsed)
    } catch {}
    const splitted = value.split(',').map(v => Number(v.trim())).filter(Number.isFinite)
    if (splitted.length) {
      const unique = Array.from(new Set(splitted)).sort((a, b) => a - b)
      return unique
    }
  }
  return []
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    const list = []
    const seen = new Set()
    for (const raw of value) {
      const str = typeof raw === 'string' ? raw : (raw ?? '').toString()
      const trimmed = str.trim()
      if (!trimmed || seen.has(trimmed)) continue
      seen.add(trimmed)
      list.push(trimmed)
    }
    return list
  }
  if (value && typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return normalizeTextArray(parsed)
    } catch {}
    const parts = value.split(/[\n,;]+/)
    return normalizeTextArray(parts)
  }
  return []
}

export { normalizeLineaNegocio, normalizeTextArray }

export async function updateNocoRecord(recordId, payload, signal) {
  if (recordId == null) throw new Error('Missing recordId')
  const numericId = typeof recordId === 'number' ? recordId : Number(recordId)
  if (!Number.isFinite(numericId)) throw new Error('Invalid recordId')

  const url = `${BASE_URL}/prospection/siete_service_meetings/${numericId}`
  const body = normalizePayloadForApi(payload)

  const res = await fetch(url, {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    let info = ''
    try { info = await res.text() } catch {}
    throw new Error(`Update failed HTTP ${res.status}${info ? `: ${info}` : ''}`)
  }
  return res.json().catch(() => ({}))
}

export async function createNocoRecord(payload, signal) {
  const url = `${BASE_URL}/prospection/siete_service_meetings/`
  const body = normalizePayloadForApi(payload)

  const res = await fetch(url, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    let info = ''
    try { info = await res.text() } catch {}
    throw new Error(`Create failed HTTP ${res.status}${info ? `: ${info}` : ''}`)
  }
  const data = await res.json().catch(() => ({}))
  const rec = Array.isArray(data) ? data[0] : data
  return rec
}

export async function archiveNocoRecords(ids, signal) {
  const numericIds = (ids || []).map(id => typeof id === 'number' ? id : Number(id)).filter(id => Number.isFinite(id))
  if (!numericIds.length) return { ok: true, archived: 0 }

  const results = await Promise.all(
    numericIds.map(id => {
      const url = `${BASE_URL}/prospection/siete_service_meetings/${id}`
      return fetch(url, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ archived: true }),
        signal,
      })
    })
  )

  for (const res of results) {
    if (!res.ok) {
      let info = ''
      try { info = await res.text() } catch {}
      throw new Error(`Archive failed HTTP ${res.status}${info ? `: ${info}` : ''}`)
    }
  }
  return { ok: true, archived: numericIds.length }
}

export async function fetchMeetings({ clientFilter, ALL } = {}, signal) {
  const url = buildMeetingsUrl({ clientFilter, ALL })
  const res = await fetch(url.toString(), {
    headers: { 'x-api-key': API_KEY },
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json().catch(() => [])
  const list = Array.isArray(data) ? data : []
  // Filter client-side since backend 500s on BIGINT/BOOLEAN filters
  return list.filter(rec => {
    if (rec.archived) return false
    if (clientFilter && clientFilter !== ALL) {
      const numericFilter = Number(clientFilter)
      if (Number.isFinite(numericFilter) && rec.client_id !== numericFilter) return false
    }
    return true
  })
}

function normalizePayloadForApi(payload = {}) {
  const body = { ...payload }
  if ('id' in body) delete body.id
  if ('recordId' in body) delete body.recordId
  if ('record_id' in body) delete body.record_id
  if ('AE_mails' in body) {
    const normalized = normalizeTextArray(body.AE_mails)
    delete body.AE_mails
    body.ae_mails = normalized
  }
  return body
}
