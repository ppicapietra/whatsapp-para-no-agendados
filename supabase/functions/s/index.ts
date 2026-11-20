const BUCKET = 'wanoa_tmp'
const ICON_URL = 'https://grupopietra.com/tools/wsp-ncs/images/whatsapp-512.png'

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
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    return new Response('El enlace venció', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }

  if (route.kind === 'file') return streamObject(row.object_path, row.content_type, row.filename, request.method)
  if (route.kind === 'preview') {
    if (!row.preview_path) return new Response('Not found', { status: 404 })
    return streamObject(row.preview_path, 'image/jpeg', 'preview.jpg', request.method)
  }

  return new Response(renderPage(row), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  })
})

function routeOf(pathname: string): { code: string; kind: 'page' | 'file' | 'preview' } | null {
  const parts = pathname.split('/').filter(Boolean)
  const codeIndex = parts.findIndex((part, index) => part.length === 8 && /^[0-9A-Za-z]+$/.test(part) && parts[index - 1] === 's')
  if (codeIndex === -1) return null
  const next = parts[codeIndex + 1]
  if (!next) return { code: parts[codeIndex], kind: 'page' }
  if (next === 'file' || next === 'preview') return { code: parts[codeIndex], kind: next }
  return null
}

function serviceHeaders(): Headers {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  return new Headers({
    apikey: key,
    Authorization: `Bearer ${key}`
  })
}

async function loadShare(code: string): Promise<ShareRow | null> {
  const base = Deno.env.get('SUPABASE_URL')
  if (!base) return null
  const response = await fetch(
    `${base}/rest/v1/wanoa_shares?code=eq.${code}&select=code,object_path,preview_path,preview_width,preview_height,content_type,filename,byte_size,expires_at`,
    { headers: serviceHeaders() }
  )
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
    headers: serviceHeaders()
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

function renderPage(row: ShareRow): string {
  const base = Deno.env.get('SUPABASE_URL')
  const pageUrl = `${base}/functions/v1/s/${row.code}`
  const fileUrl = `${pageUrl}/file`
  const title = row.filename.slice(0, 80)
  const description = 'Disponible durante 10 días.'
  const image = row.preview_path
    ? `${pageUrl}/preview`
    : ICON_URL
  const imageType = row.preview_path ? 'image/jpeg' : 'image/png'
  const sizeMeta = row.preview_width && row.preview_height
    ? `<meta property="og:image:width" content="${row.preview_width}">
<meta property="og:image:height" content="${row.preview_height}">`
    : ''
  const media = mediaMarkup(row.content_type, fileUrl, title)

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="${imageType}">
<meta property="og:image:alt" content="${escapeHtml(title)}">
${sizeMeta}
<style>
  body { margin: 0; font-family: sans-serif; background: #f6f7f8; color: #222; }
  main { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
  img, video { display: block; max-width: 100%; height: auto; margin: 0 auto 16px; border-radius: 12px; background: #fff; }
  h1 { font-size: 1.1rem; font-weight: 600; word-break: break-word; }
  p { color: #666; }
  a.file { display: inline-block; margin-top: 8px; background: #128C7E; color: #fff; text-decoration: none; padding: 12px 16px; border-radius: 8px; }
</style>
</head>
<body>
<main>
  ${media}
  <h1>${escapeHtml(row.filename)}</h1>
  <p>${description}</p>
  <a class="file" href="${fileUrl}">Abrir archivo</a>
</main>
</body>
</html>`
}

function mediaMarkup(contentType: string, fileUrl: string, title: string): string {
  if (contentType.startsWith('image/')) return `<img src="${fileUrl}" alt="${escapeHtml(title)}">`
  if (contentType.startsWith('video/')) return `<video src="${fileUrl}" controls playsinline></video>`
  return ''
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeFilename(filename: string): string {
  const cleaned = filename.replace(/[^A-Za-z0-9._-]/g, '_')
  return cleaned || 'archivo'
}
