export function buildNocoUrl(baseUrl, { clientFilter, ALL }) {
  const u = new URL(baseUrl)
  u.searchParams.append('order', 'id.desc')
  if (clientFilter && clientFilter !== ALL) {
    const numericId = Number(clientFilter)
    if (Number.isFinite(numericId)) {
      u.searchParams.set('client_id', `eq.${numericId}`)
    }
  }
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
  return {
    id: rowId,
    recordId: Number.isFinite(recordId) ? recordId : null,
    clientId,
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

export async function updateNocoRecord(baseUrl, token, recordId, payload, signal) {
  if (recordId == null) throw new Error('Missing recordId')
  const numericId = typeof recordId === 'number' ? recordId : Number(recordId)
  if (!Number.isFinite(numericId)) throw new Error('Invalid recordId')
  const u = new URL(baseUrl)
  u.searchParams.set('id', `eq.${numericId}`)

  const body = { ...payload }

  const headers = {
    'Content-Profile': 'prospection',
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  console.log('[REST][PATCH] request', { url: u.toString(), headers, body })

  const res = await fetch(u.toString(), {
    method: 'PATCH',
    headers,
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

export async function createNocoRecord(baseUrl, token, payload, signal) {
  const u = new URL(baseUrl)
  const headers = {
    'Content-Profile': 'prospection',
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  console.log('[REST][POST] request', { url: u.toString(), headers, body: payload })
  const res = await fetch(u.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  })
  console.log('[REST][POST] status', res.status)
  if (!res.ok) {
    let info = ''
    try { info = await res.text() } catch {}
    throw new Error(`Create failed HTTP ${res.status}${info ? `: ${info}` : ''}`)
  }
  const data = await res.json().catch(() => ({}))
  console.log('[REST][POST] response', data)
  const rec = Array.isArray(data) ? data[0] : data
  return rec
}

export async function deleteNocoRecords(baseUrl, token, ids, signal) {
  const numericIds = (ids || []).map(id => typeof id === 'number' ? id : Number(id)).filter(id => Number.isFinite(id))
  if (!numericIds.length) return { ok: true, deleted: 0 }
  const u = new URL(baseUrl)
  u.searchParams.set('id', `in.(${numericIds.join(',')})`)
  const headers = { 'Content-Profile': 'prospection' }
  console.log('[REST][DELETE] request', { url: u.toString(), headers })
  const res = await fetch(u.toString(), {
    method: 'DELETE',
    headers,
    signal,
  })
  console.log('[REST][DELETE] status', res.status)
  if (!res.ok) throw new Error(`Delete failed HTTP ${res.status}`)
  return { ok: true, deleted: numericIds.length }
}
