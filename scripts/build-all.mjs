// pnpm build  — build every public deck to dist/<slug>/ and the gallery to dist/index.html.
// BASE defaults to /SlidevPresentation/ (GitHub Pages project path). Use BASE=/ for a root domain.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_URL, ROOT, listDecks, run, slidev } from './lib.mjs'

const BASE = (process.env.BASE ?? '/SlidevPresentation/').replace(/\/?$/, '/')
const DIST = join(ROOT, 'dist')
rmSync(DIST, { recursive: true, force: true })
mkdirSync(DIST, { recursive: true })

const decks = listDecks({ includePrivate: false })
for (const deck of decks) {
  console.log(`\n🏗  ${deck.slug}`)
  run(slidev(deck), ['build', '--base', `${BASE}${deck.slug}/`, '--out', join(DIST, deck.slug)], { cwd: deck.dir })
  if (deck.hasThumbnail) copyFileSync(join(deck.dir, 'thumbnail.png'), join(DIST, deck.slug, 'thumbnail.png'))
}

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const cards = decks.map((d) => `
    <article class="deck" data-tags="${esc((d.tags ?? []).join(' ').toLowerCase())}">
      <a class="thumb" href="${BASE}${d.slug}/">${d.hasThumbnail ? `<img src="${BASE}${d.slug}/thumbnail.png" alt="" loading="lazy">` : '<div class="noimg"></div>'}</a>
      <div class="body">
        <div class="meta"><time>${esc(d.date)}</time>${(d.tags ?? []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <h2><a href="${BASE}${d.slug}/">${esc(d.title)}</a></h2>
        <p>${esc(d.description)}</p>
        <div class="links">
          <a class="btn solid" href="${BASE}${d.slug}/">打开演示</a>
          <a class="btn" href="${BASE}${d.slug}/#/presenter/1">演讲者模式</a>
          ${d.hasAttachments ? `<a class="btn" href="${REPO_URL}/tree/main/decks/${d.slug}/attachments">附件与代码</a>` : ''}
          <a class="btn ghost" href="${REPO_URL}/tree/main/decks/${d.slug}">源文件</a>
        </div>
      </div>
    </article>`).join('')

const tpl = readFileSync(join(ROOT, 'gallery', 'index.html'), 'utf8')
writeFileSync(join(DIST, 'index.html'), tpl.replace('<!--DECKS-->', cards).replaceAll('__COUNT__', String(decks.length)).replaceAll('__REPO__', REPO_URL))
writeFileSync(join(DIST, '.nojekyll'), '')
console.log(`\n✅ ${decks.length} 份 PPT → dist/（base ${BASE}）`)
