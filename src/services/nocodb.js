export function buildNocoUrl(baseUrl, { clientFilter, ALL, viewId }) {
  const u = new URL(baseUrl)
  u.searchParams.set('offset', '0')
  u.searchParams.set('limit', '500')
  // Order by celebration_date DESC (newest first) per NocoDB v2
  try {
    const sortSpec = [{ field: 'celebration_date', order: 'desc' }]
    u.searchParams.set('sortArr', JSON.stringify(sortSpec))
    // Some deployments also accept fallback params
    u.searchParams.set('sort', 'celebration_date')
    u.searchParams.set('order', 'desc')
  } catch {}
  if (clientFilter && clientFilter !== ALL) {
    u.searchParams.set('where', `(client,eq,${clientFilter})`)
  } else if (viewId) {
    u.searchParams.set('viewId', viewId)
  }
  return u
}

export function mapRecordToRow(rec) {
  return {
    id: `api_${(rec?.id ?? rec?.Id ?? cryptoRandom())}`,
    recordId: (rec?.id ?? rec?.Id ?? null),
    company: rec.company ?? '',
    fecha: rec.celebration_date ?? '',
    status: rec.status ?? '',
    kdm: rec.kdm ?? '',
    tituloKdm: rec.kdm_title ?? '',
    industria: rec.industry ?? '',
    empleados: rec.employers_quantity ?? '',
    score: typeof rec.score === 'number' ? rec.score : (rec.score ?? ''),
    feedback: rec.feedback ?? '',
    cliente: rec.client ?? '',
  }
}

function cryptoRandom() {
  try {
    return Math.random().toString(36).slice(2, 10)
  } catch {
    return Date.now().toString(36)
  }
}

export async function updateNocoRecord(baseUrl, token, recordId, payload, signal) {
  // NocoDB v2 PATCH: /api/v2/tables/{tableId}/records with body [{ Id, ...fields }]
  const m = /tables\/([^/]+)\/records/.exec(baseUrl)
  const tableId = m ? m[1] : null
  if (!tableId || recordId == null) throw new Error('Missing tableId or recordId')
  const u = new URL(baseUrl)
  u.pathname = `/api/v2/tables/${tableId}/records`
  const body = [{ id: typeof recordId === 'string' ? Number(recordId) : recordId, ...payload }]

  // Debug
  console.log('[NocoDB][PATCH]', u.toString(), body, {
    headers: { 'Content-Type': 'application/json', 'xc-token': token ? token.slice(0,4)+'...' : 'missing' },
    method: 'PATCH'
  })

  const res = await fetch(u.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'xc-token': token },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`Update failed HTTP ${res.status}`)
  return res.json().catch(() => ({}))
}

export async function createNocoRecord(baseUrl, token, payload, signal) {
  // POST /api/v2/tables/{tableId}/records with object payload
  const m = /tables\/([^/]+)\/records/.exec(baseUrl)
  const tableId = m ? m[1] : null
  if (!tableId) throw new Error('Missing tableId')
  const u = new URL(baseUrl)
  u.pathname = `/api/v2/tables/${tableId}/records`
  console.log('[NocoDB][CREATE] POST', u.toString(), payload, {
    headers: { 'Content-Type': 'application/json', 'xc-token': token ? token.slice(0,4)+'...' : 'missing' }
  })
  const res = await fetch(u.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'xc-token': token },
    body: JSON.stringify(payload),
    signal,
  })
  console.log('[NocoDB][CREATE] status', res.status)
  if (!res.ok) throw new Error(`Create failed HTTP ${res.status}`)
  const data = await res.json().catch(() => ({}))
  console.log('[NocoDB][CREATE] response', data)
  // Response can be object or array; normalize to first object
  const rec = Array.isArray(data) ? data[0] : data
  return rec
}
