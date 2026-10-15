// Shared helpers: every folder under decks/ with a deck.json is a deck.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DECKS = join(ROOT, 'decks')
export const REPO_URL = 'https://github.com/YuniqueUnic/SlidevPresentation'

export function listDecks({ includePrivate = true } = {}) {
  return readdirSync(DECKS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(DECKS, d.name, 'deck.json')))
    .map((d) => {
      const dir = join(DECKS, d.name)
      const meta = JSON.parse(readFileSync(join(dir, 'deck.json'), 'utf8'))
      return {
        slug: d.name,
        dir,
        ...meta,
        hasThumbnail: existsSync(join(dir, 'thumbnail.png')),
        hasAttachments: existsSync(join(dir, 'attachments')),
      }
    })
    .filter((d) => includePrivate || d.public)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export function findDeck(slug) {
  const decks = listDecks()
  const deck = decks.find((d) => d.slug === slug) ?? decks.find((d) => d.slug.includes(slug ?? ''))
  if (!deck) {
    console.error(`找不到 PPT：${slug}\n可用的有：\n${decks.map((d) => `  - ${d.slug}`).join('\n')}`)
    process.exit(1)
  }
  return deck
}

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} 失败（退出码 ${r.status}）`)
}

export const slidev = (deck) => join(deck.dir, 'node_modules', '.bin', 'slidev')
