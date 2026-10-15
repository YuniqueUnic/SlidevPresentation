// pnpm dev          — local navigation page on http://localhost:3030
// pnpm dev <slug>   — start one deck directly
import { findDeck, run, slidev } from './lib.mjs'

const slug = process.argv[2]
if (!slug) await import('./hub.mjs')
else {
  const deck = findDeck(slug)
  console.log(`▶ ${deck.slug}：${deck.title}`)
  run(slidev(deck), ['--open', ...process.argv.slice(3)], { cwd: deck.dir })
}
