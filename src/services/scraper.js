/**
 * Scrape a web page and return its text content.
 * Uses Jina AI Reader (r.jina.ai) which runs headless Chrome, so it handles
 * static pages, SPAs, Next.js (SSR/CSR), and all JS-heavy sites.
 */
const SCRAPE_TIMEOUT_MS = 25_000 // 25 s hard limit on our side

export async function scrapeWebPage(url, { signal: externalSignal } = {}) {
  if (!url || !url.trim()) return ''

  let target = url.trim()
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target

  const readerUrl = `https://r.jina.ai/${target}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS)
  // Also abort if the caller cancels
  externalSignal?.addEventListener('abort', () => controller.abort())

  try {
    const res = await fetch(readerUrl, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'markdown',
        'X-Timeout': '20', // tell Jina's side to stop after 20 s
      },
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Timeout al leer la página web')
    throw err
  } finally {
    clearTimeout(timer)
  }
}
