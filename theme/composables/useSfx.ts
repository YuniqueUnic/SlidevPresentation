// One audio engine shared by every deck: named sound effects + looping
// background music, played from the CC0 recordings in ../sfx (see CREDITS.md).
//
//   import { useSfx } from 'slidev-theme-unicorn/composables/useSfx'
//   useSfx().play('success')
//
// Which file each effect uses lives in ../sfx/catalog.json. Per-deck defaults:
//   themeConfig:
//     sfx: { volume: 0.6, music: false, musicVolume: 0.25, track: contemplation }
import { ref } from 'vue'
import catalog from '../sfx/catalog.json'

export type SfxName = keyof typeof catalog.effects
export interface SfxOptions { volume?: number; music?: boolean; musicVolume?: number; track?: string }

// Bundled by Vite, so URLs respect the deck's base path.
const urls = import.meta.glob('../sfx/**/*.mp3', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const fileUrl = (name: string) =>
  urls[`../sfx/ui/${name}.mp3`] ?? urls[`../sfx/music/${name}.mp3`]

// Synthesized sounds, referenced in catalog.json as "synth:<name>".
// soft-tick: a soft wooden tick (two sine/triangle partials + a tiny noise transient).
const SYNTH: Record<string, (a: AudioContext, out: AudioNode, t: number) => void> = {
  'soft-tick': (a, out, t) => {
    const partial = (f: number, f2: number, dur: number, peak: number, type: OscillatorType) => {
      const o = a.createOscillator(); const g = a.createGain()
      o.type = type
      o.frequency.setValueAtTime(f, t)
      o.frequency.exponentialRampToValueAtTime(f2, t + dur)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(peak, t + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02)
    }
    partial(1320, 880, 0.06, 0.28, 'sine')
    partial(2640, 2400, 0.03, 0.08, 'triangle')
    const len = Math.floor(a.sampleRate * 0.03)
    const buf = a.createBuffer(1, len, a.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = a.createBufferSource(); src.buffer = buf
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 2
    const g = a.createGain(); g.gain.value = 0.1
    src.connect(f).connect(g).connect(out); src.start(t)
  },
}

// Per-effect loudness so ticks sit under the voice and alerts are clearly audible.
const GAIN: Record<string, number> = { click: 0.6, slide: 0.55, reveal: 0.6, pop: 0.6, success: 0.8, warning: 0.8, error: 0.8, notify: 0.75 }
// Small pitch variation for frequent sounds, so repeats don't feel mechanical.
const JITTER: Record<string, number> = { click: 0.04, slide: 0.05 }

const LS = { on: 'unicorn-sfx-on', music: 'unicorn-music-on', vol: 'unicorn-sfx-volume', track: 'unicorn-music-track' }
const read = (k: string) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(k))
const write = (k: string, v: string) => { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v) }

const enabled = ref(read(LS.on) !== '0')
const musicOn = ref(read(LS.music) === '1')
const volume = ref(Number(read(LS.vol) ?? 0.6))
const track = ref(read(LS.track) ?? catalog.music.use)
let musicVolume = 0.25

let ctx: AudioContext | null = null
let master: GainNode, sfxBus: GainNode, musicBus: GainNode
let musicEl: HTMLAudioElement | null = null
const buffers = new Map<string, Promise<AudioBuffer>>()

function engine(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain(); master.gain.value = volume.value
    sfxBus = ctx.createGain(); sfxBus.connect(master)
    musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master)
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function load(a: AudioContext, name: string): Promise<AudioBuffer> {
  if (!buffers.has(name)) {
    const url = fileUrl(name)
    if (!url) return Promise.reject(new Error(`unknown sound file: ${name}`))
    buffers.set(name, fetch(url).then((r) => r.arrayBuffer()).then((b) => a.decodeAudioData(b)))
  }
  return buffers.get(name)!
}

function duck(a: AudioContext, seconds = 0.8) {
  if (!musicOn.value) return
  const t = a.currentTime
  musicBus.gain.cancelScheduledValues(t)
  musicBus.gain.setTargetAtTime(musicVolume * 0.4, t, 0.04)
  musicBus.gain.setTargetAtTime(musicVolume, t + seconds, 0.5)
}

function startMusic() {
  const a = engine(); if (!a) return
  if (!musicEl) {
    musicEl = new Audio()
    musicEl.loop = true
    musicEl.crossOrigin = 'anonymous'
    a.createMediaElementSource(musicEl).connect(musicBus)
  }
  const url = fileUrl(track.value) ?? fileUrl(catalog.music.use)
  if (url && !musicEl.src.endsWith(url)) musicEl.src = url
  musicEl.play().catch(() => {})
  musicBus.gain.cancelScheduledValues(a.currentTime)
  musicBus.gain.setTargetAtTime(musicVolume, a.currentTime, 0.8) // fade in
}

function stopMusic() {
  if (!ctx || !musicEl) return
  musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.4) // fade out
  const el = musicEl
  setTimeout(() => { if (!musicOn.value) el.pause() }, 1600)
}

// Decode the effect files once the page is interactive, so the first click is instant.
function preload(a: AudioContext) {
  for (const e of Object.values(catalog.effects)) for (const n of e.use) if (!n.startsWith('synth:')) load(a, n).catch(() => {})
}

export function useSfx() {
  function configure(o: SfxOptions = {}) {
    if (o.volume !== undefined && read(LS.vol) === null) volume.value = o.volume
    if (o.musicVolume !== undefined) musicVolume = o.musicVolume
    if (o.music !== undefined && read(LS.music) === null) musicOn.value = o.music
    if (o.track && read(LS.track) === null) track.value = o.track
  }

  async function play(name: SfxName) {
    if (!enabled.value) return
    const a = engine(); if (!a) return
    const choices = catalog.effects[name]?.use ?? []
    const file = choices[Math.floor(Math.random() * choices.length)]
    if (!file) return
    if (file.startsWith('synth:')) {
      const g = a.createGain(); g.gain.value = GAIN[name] ?? 0.7; g.connect(sfxBus)
      duck(a)
      SYNTH[file.slice(6)]?.(a, g, a.currentTime + 0.005)
      return
    }
    try {
      const buf = await load(a, file)
      const src = a.createBufferSource(); src.buffer = buf
      const j = JITTER[name] ?? 0
      src.playbackRate.value = 1 + (Math.random() * 2 - 1) * j
      const g = a.createGain(); g.gain.value = GAIN[name] ?? 0.7
      src.connect(g).connect(sfxBus)
      duck(a)
      src.start()
    } catch { /* missing or undecodable file: stay silent */ }
  }

  /** Play a specific file by name (used by the audition page). */
  async function playFile(file: string) {
    const a = engine(); if (!a) return
    if (file.startsWith('synth:')) return SYNTH[file.slice(6)]?.(a, sfxBus, a.currentTime + 0.005)
    const src = a.createBufferSource(); src.buffer = await load(a, file)
    src.connect(sfxBus); src.start()
  }

  function toggle() { enabled.value = !enabled.value; write(LS.on, enabled.value ? '1' : '0'); if (enabled.value) play('pop') }
  function toggleMusic() {
    musicOn.value = !musicOn.value; write(LS.music, musicOn.value ? '1' : '0')
    musicOn.value ? startMusic() : stopMusic()
  }
  function nextTrack() {
    const names = Object.keys(catalog.music.tracks)
    track.value = names[(names.indexOf(track.value) + 1) % names.length]
    write(LS.track, track.value)
    if (musicOn.value) startMusic()
  }
  function setVolume(v: number) {
    volume.value = Math.min(1, Math.max(0, v)); write(LS.vol, String(volume.value))
    if (ctx) master.gain.setTargetAtTime(volume.value, ctx.currentTime, 0.05)
  }
  /** Call after the first user gesture: unlock audio, preload, resume music if it was on. */
  function wake() {
    const a = engine(); if (!a) return
    preload(a)
    if (musicOn.value) startMusic()
  }

  return {
    enabled, musicOn, volume, track, catalog,
    configure, play, playFile, toggle, toggleMusic, nextTrack, setVolume, wake,
    names: Object.keys(catalog.effects) as SfxName[],
  }
}
