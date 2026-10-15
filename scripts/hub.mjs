// Local navigation page (pnpm dev): http://localhost:3030
// Lists every deck (public or not). Opening a deck starts its Slidev dev
// server on demand (3031, 3032, …) and redirects there, so edits hot-reload.
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createConnection } from 'node:net'
import { REPO_URL, ROOT, listDecks, slidev } from './lib.mjs'
import { handleSfx } from './sfx-lab.mjs'

const PORT = Number(process.env.PORT ?? 3030)
const running = new Map() // slug -> port

const portOpen = (port) => new Promise((r) => {
  const s = createConnection({ port, host: '127.0.0.1' }, () => { s.end(); r(true) })
  s.on('error', () => r(false))
})

async function ensureDeck(deck, index) {
  if (running.has(deck.slug)) return running.get(deck.slug)
  const port = PORT + 1 + index
  if (!(await portOpen(port))) {
    const child = spawn(slidev(deck), ['--port', String(port)], { cwd: deck.dir, stdio: 'ignore' })
    child.on('exit', () => running.delete(deck.slug))
    for (let i = 0; i < 60 && !(await portOpen(port)); i++) await new Promise((r) => setTimeout(r, 500))
  }
  running.set(deck.slug, port)
  return port
}

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function page() {
  const decks = listDecks()
  const cards = decks.map((d) => `
    <article class="deck" data-tags="${esc((d.tags ?? []).join(' ').toLowerCase())}">
      <a class="thumb" href="/open/${d.slug}">${d.hasThumbnail ? `<img src="/thumb/${d.slug}.png" alt="">` : '<div class="noimg"></div>'}</a>
      <div class="body">
        <div class="meta"><time>${esc(d.date)}</time>${d.public ? '' : '<span class="tag">未公开</span>'}${(d.tags ?? []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <h2><a href="/open/${d.slug}">${esc(d.title)}</a></h2>
        <p>${esc(d.description)}</p>
        <div class="links">
          <a class="btn solid" href="/open/${d.slug}">打开演示</a>
          <a class="btn" href="/open/${d.slug}?presenter=1">演讲者模式</a>
          <span class="btn ghost">decks/${d.slug}</span>
        </div>
      </div>
    </article>`).join('')
  return readFileSync(join(ROOT, 'gallery', 'index.html'), 'utf8')
    .replace('<!--DECKS-->', cards).replaceAll('__COUNT__', String(decks.length)).replaceAll('__REPO__', REPO_URL)
    .replace('每份 PPT 都可以直接在浏览器里放映；附件和代码放在同一个仓库里。', '本地预览：打开一份 PPT 时自动启动它的开发服务器，修改会实时刷新。 <a href="/sfx" style="color:#fff">音效试听 →</a>')
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  if (await handleSfx(req, res, url)) return
  const decks = listDecks()
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(page())
  }
  const thumb = url.pathname.match(/^\/thumb\/(.+)\.png$/)
  if (thumb) {
    const p = join(ROOT, 'decks', thumb[1], 'thumbnail.png')
    if (existsSync(p)) { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(readFileSync(p)) }
  }
  const open = url.pathname.match(/^\/open\/(.+)$/)
  if (open) {
    const i = decks.findIndex((d) => d.slug === open[1])
    if (i >= 0) {
      const port = await ensureDeck(decks[i], i)
      res.writeHead(302, { location: `http://localhost:${port}/${url.searchParams.has('presenter') ? '#/presenter/1' : ''}` })
      return res.end()
    }
  }
  res.writeHead(404); res.end('not found')
}).listen(PORT, () => console.log(`导航页：http://localhost:${PORT}`))
