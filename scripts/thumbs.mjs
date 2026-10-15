// pnpm thumbs [slug]  — screenshot slide 1 of each deck into decks/<slug>/thumbnail.png
// Waits for the network to go quiet; decks that load remote images forever
// (e.g. a random cover photo) fall back to "page loaded + a few seconds".
import { mkdtempSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findDeck, listDecks, slidev } from './lib.mjs'

const decks = process.argv[2] ? [findDeck(process.argv[2])] : listDecks()
const attempts = [
  ['--wait-until', 'networkidle', '--wait', '1500', '--timeout', '60000'],
  ['--wait-until', 'load', '--wait', '4000', '--timeout', '60000'],
]
for (const deck of decks) {
  console.log(`📸 ${deck.slug}`)
  let ok = false
  for (const extra of attempts) {
    const out = mkdtempSync(join(tmpdir(), 'thumb-'))
    const r = spawnSync(slidev(deck), ['export', '--format', 'png', '--range', '1', '--scale', '1', '--output', out, ...extra], { cwd: deck.dir, stdio: 'ignore' })
    const png = readdirSync(out).find((f) => f.endsWith('.png'))
    if (r.status === 0 && png) { renameSync(join(out, png), join(deck.dir, 'thumbnail.png')); ok = true }
    rmSync(out, { recursive: true, force: true })
    if (ok) break
  }
  console.log(ok ? '   完成' : '   失败：请手动检查这份 PPT 能否正常导出')
}
