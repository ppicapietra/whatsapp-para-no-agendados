const BUCKET = 'wanoa_tmp'
const PUBLISHABLE_KEY = 'sb_publishable_hjHMfLqdx3CYrK9pd34KYg_KgtYKtd3'

type ShareRow = {
  code: string
  object_path: string
  preview_path: string | null
  preview_width: number | null
  preview_height: number | null
  content_type: string
  filename: string
  byte_size: number
  expires_at: string
}

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 })
  }

  const route = routeOf(new URL(request.url).pathname)
  if (!route) return new Response('Not found', { status: 404 })

  const row = await loadShare(route.code)
  if (!row) {
    return textResponse('No se encontró el archivo', 404)
  }
  const expiresAt = new Date(row.expires_at).getTime()
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    return textResponse('El enlace venció', 404)
  }

  if (route.kind === 'info') return shareInfo(row)
  if (route.kind === 'preview') {
    if (!row.preview_path) return new Response('Not found', { status: 404 })
    return streamObject(row.preview_path, 'image/jpeg', 'preview.jpg', request.method)
  }

  return streamObject(row.object_path, row.content_type, row.filename, request.method)
})

function routeOf(pathname: string): { code: string; kind: 'page' | 'file' | 'preview' | 'info' } | null {
  const parts = pathname.split('/').filter(Boolean)
  const codeIndex = parts.findIndex((part, index) => part.length === 8 && /^[0-9A-Za-z]+$/.test(part) && parts[index - 1] === 's')
  if (codeIndex === -1) return null
  const next = parts[codeIndex + 1]
  if (!next) return { code: parts[codeIndex], kind: 'page' }
  if (next === 'file' || next === 'preview' || next === 'info') return { code: parts[codeIndex], kind: next }
  return null
}

function shareInfo(row: ShareRow): Response {
  const base = Deno.env.get('SUPABASE_URL') || 'https://ymyrdyuwrtborbpcrswx.supabase.co'
  const fileUrl = `${base}/functions/v1/s/${row.code}`
  const payload = {
    code: row.code,
    filename: row.filename,
    content_type: row.content_type,
    byte_size: row.byte_size,
    expires_at: row.expires_at,
    file_url: fileUrl,
    preview_url: row.preview_path ? `${fileUrl}/preview` : null,
    preview_width: row.preview_width,
    preview_height: row.preview_height
  }
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'access-control-allow-origin': '*'
    }
  })
}

function textResponse(message: string, status: number): Response {
  return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

function publishableKey(): string {
  const named = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (named) {
    try {
      const parsed = JSON.parse(named)
      if (parsed && typeof parsed.default === 'string') return parsed.default
    } catch (_error) {
      // Use the public key shipped with the app.
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') || PUBLISHABLE_KEY
}

function apiHeaders(): Headers {
  const key = publishableKey()
  const headers = new Headers({ apikey: key })
  if (key.startsWith('eyJ')) headers.set('Authorization', `Bearer ${key}`)
  return headers
}

async function loadShare(code: string): Promise<ShareRow | null> {
  const base = Deno.env.get('SUPABASE_URL')
  if (!base) return null
  const headers = apiHeaders()
  headers.set('Content-Type', 'application/json')
  const response = await fetch(`${base}/rest/v1/rpc/wanoa_share_lookup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ share_code: code })
  })
  if (!response.ok) return null
  const rows = await response.json()
  return Array.isArray(rows) && rows.length ? rows[0] as ShareRow : null
}

async function streamObject(path: string, contentType: string, filename: string, method: string): Promise<Response> {
  const base = Deno.env.get('SUPABASE_URL')
  if (!base) return new Response('Not configured', { status: 500 })
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  const response = await fetch(`${base}/storage/v1/object/authenticated/${BUCKET}/${encoded}`, {
    method: 'GET',
    headers: apiHeaders()
  })
  if (!response.ok || !response.body) return new Response('Not found', { status: 404 })
  const headers = new Headers({
    'content-type': contentType,
    'content-disposition': `inline; filename="${safeFilename(filename)}"`,
    'cache-control': 'public, max-age=86400',
    'x-content-type-options': 'nosniff'
  })
  const length = response.headers.get('content-length')
  if (length) headers.set('content-length', length)
  return new Response(method === 'HEAD' ? null : response.body, { status: 200, headers })
}

function safeFilename(filename: string): string {
  const cleaned = filename.replace(/[^A-Za-z0-9._-]/g, '_')
  return cleaned || 'archivo'
}
