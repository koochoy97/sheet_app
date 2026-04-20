// import-icps.js — run once with: node import-icps.js
// Syncs ICPs from AI SDR → core.clientes_icp via REST API
// Format: icp_description stored as "nombre | icp_description" to match existing schema

const AISDR_URL = 'https://aisdr.wearesiete.com/api/v1/icps'
const AISDR_KEY = '59727bc014970f1a2b8cd4be6e5bd029f726884e75cfb7e018bf0cef0d0f0f44'
const SIETE_URL = 'https://apirest.wearesiete.com'
const SIETE_KEY = '6723a60ebd5d502542b148fd5e7c952ed965490f2a1f254797d26ec92cf5d3db'

const sieteHeaders = {
  'x-api-key': SIETE_KEY,
  'Content-Type': 'application/json',
}

function buildDescription(name, icpDescription) {
  // Store as "nombre | icp_description" — same format the frontend already parses
  if (!icpDescription) return name
  return `${name} | ${icpDescription}`
}

async function main() {
  console.log('Fetching ICPs from AI SDR...')
  const aisdrRes = await fetch(AISDR_URL, { headers: { 'x-api-key': AISDR_KEY } })
  if (!aisdrRes.ok) throw new Error(`AI SDR fetch failed: HTTP ${aisdrRes.status}`)
  const aisdrData = await aisdrRes.json()
  const aisdrIcps = Array.isArray(aisdrData) ? aisdrData : (aisdrData.data ?? aisdrData.items ?? [])
  console.log(`  → ${aisdrIcps.length} ICPs from AI SDR`)

  console.log('Fetching existing ICPs from core.clientes_icp...')
  const existingRes = await fetch(`${SIETE_URL}/core/clientes_icp/?limit=500`, { headers: sieteHeaders })
  if (!existingRes.ok) throw new Error(`Existing ICPs fetch failed: HTTP ${existingRes.status}`)
  const existingData = await existingRes.json()
  const existingIcps = Array.isArray(existingData) ? existingData : []
  console.log(`  → ${existingIcps.length} existing ICPs in core.clientes_icp`)

  // Index existing by "name::client_id" — name is the part before the first " | "
  const byKey = new Map()
  for (const r of existingIcps) {
    const desc = r.icp_description ?? ''
    const pipeIdx = desc.indexOf(' | ')
    const name = pipeIdx !== -1 ? desc.slice(0, pipeIdx).trim() : desc.trim()
    const key = `${name}::${r.client_id}`
    byKey.set(key, r)
  }

  let created = 0
  let updated = 0
  let errors = 0
  let skipped = 0

  for (const icp of aisdrIcps) {
    const nombre = (icp.name ?? '').trim()
    const clientId = icp.client_siete_id ?? null
    const icpDescription = icp.icp_description ?? ''

    if (!nombre || !clientId) {
      console.warn(`  SKIP — missing name or client_id: id=${icp.id}`)
      skipped++
      continue
    }

    const fullDescription = buildDescription(nombre, icpDescription)
    const key = `${nombre}::${clientId}`
    const existing = byKey.get(key)

    const payload = {
      client_id: Number(clientId),
      icp_description: fullDescription,
    }

    try {
      if (existing) {
        // Only update if description changed
        if (existing.icp_description === fullDescription) {
          skipped++
          process.stdout.write('.')
          continue
        }
        const patchRes = await fetch(`${SIETE_URL}/core/clientes_icp/${existing.id}`, {
          method: 'PATCH',
          headers: sieteHeaders,
          body: JSON.stringify(payload),
        })
        if (!patchRes.ok) {
          const txt = await patchRes.text().catch(() => '')
          throw new Error(`PATCH ${existing.id} failed HTTP ${patchRes.status}: ${txt}`)
        }
        updated++
        process.stdout.write('U')
      } else {
        const postRes = await fetch(`${SIETE_URL}/core/clientes_icp/`, {
          method: 'POST',
          headers: sieteHeaders,
          body: JSON.stringify(payload),
        })
        if (!postRes.ok) {
          const txt = await postRes.text().catch(() => '')
          throw new Error(`POST failed HTTP ${postRes.status}: ${txt}`)
        }
        created++
        process.stdout.write('C')
      }
    } catch (e) {
      console.error(`\n  ERROR — ${nombre} (client ${clientId}): ${e.message}`)
      errors++
    }
  }

  console.log(`\n\nDone. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`)
}

main().catch(e => { console.error(e); process.exit(1) })
