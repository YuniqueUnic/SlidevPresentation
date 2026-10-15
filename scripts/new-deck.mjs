// pnpm new <slug> [--title "标题"] [--brand "品牌"] [--description "简介"]
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DECKS, ROOT } from './lib.mjs'

const args = process.argv.slice(2)
const slug = args[0]
if (!slug || slug.startsWith('--')) {
  console.error('用法：pnpm new <文件夹名> [--title 标题] [--brand 品牌] [--description 简介]\n例：pnpm new 2026-11-my-talk --title "我的分享"')
  process.exit(1)
}
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i > 0 ? args[i + 1] : d }
const dest = join(DECKS, slug)
if (existsSync(dest)) { console.error(`已存在：decks/${slug}`); process.exit(1) }

const vars = {
  __SLUG__: slug,
  __TITLE__: opt('title', slug),
  __BRAND__: opt('brand', 'Unic'),
  __DESCRIPTION__: opt('description', ''),
  __DATE__: new Date().toISOString().slice(0, 10),
}
cpSync(join(ROOT, 'scripts', 'templates', 'deck'), dest, { recursive: true })
const walk = (dir) => readdirSync(dir).forEach((f) => {
  const p = join(dir, f)
  if (statSync(p).isDirectory()) return walk(p)
  let s = readFileSync(p, 'utf8')
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(k, v)
  writeFileSync(p, s)
})
walk(dest)
console.log(`已创建 decks/${slug}\n下一步：pnpm install && pnpm dev ${slug}\n准备公开时，把 deck.json 里的 "public" 改成 true`)
