// pnpm preview  — serve dist/ under BASE so links behave like GitHub Pages.
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { ROOT } from './lib.mjs'

const BASE = (process.env.BASE ?? '/SlidevPresentation/').replace(/\/?$/, '/')
const DIST = join(ROOT, 'dist'), PORT = Number(process.env.PORT ?? 4173)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  if (!url.startsWith(BASE)) { res.writeHead(302, { location: BASE }); return res.end() }
  let p = join(DIST, url.slice(BASE.length))
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html')
  if (!existsSync(p)) {
    // SPA fallback: /<slug>/<n> -> /<slug>/index.html
    const slug = url.slice(BASE.length).split('/')[0]
    p = join(DIST, slug, 'index.html')
    if (!existsSync(p)) { res.writeHead(404); return res.end('not found') }
  }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' })
  res.end(readFileSync(p))
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}`))
