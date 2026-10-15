<script setup lang="ts">
// Sound controller, placed once in the footer by the theme.
//   click step -> 'click'   slide change -> 'slide'
//   keys: m = effects on/off · b = background music · n = next track · [ / ] = volume
import { onMounted, onUnmounted, watch } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'
import { useSfx } from '../composables/useSfx'

const { currentSlideNo, clicks, isPrintMode } = useNav()
const { $slidev } = useSlideContext()
const sfx = useSfx()
sfx.configure(($slidev?.themeConfigs as any)?.sfx ?? {})

watch(currentSlideNo, () => { if (!isPrintMode.value) sfx.play('slide') })
watch(clicks, (n, o) => { if (!isPrintMode.value && n > o) sfx.play('click') })

function onKey(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const el = e.target as HTMLElement | null
  if (el && /input|textarea/i.test(el.tagName)) return
  if (e.key === 'm') sfx.toggle()
  else if (e.key === 'b') sfx.toggleMusic()
  else if (e.key === 'n') sfx.nextTrack()
  else if (e.key === ']') sfx.setVolume(sfx.volume.value + 0.1)
  else if (e.key === '[') sfx.setVolume(sfx.volume.value - 0.1)
}
const wake = () => sfx.wake()
onMounted(() => { window.addEventListener('keydown', onKey); window.addEventListener('pointerdown', wake, { once: true }); window.addEventListener('keydown', wake, { once: true }) })
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <span v-if="!isPrintMode" class="sfx-ctl">
    <button :title="sfx.enabled.value ? '音效：开（m）' : '音效：关（m）'" @click="sfx.toggle()">
      <ph-speaker-simple-high v-if="sfx.enabled.value && sfx.volume.value > 0.6" />
      <ph-speaker-simple-low v-else-if="sfx.enabled.value" />
      <ph-speaker-simple-slash v-else />
    </button>
    <button :class="{ on: sfx.musicOn.value }" :title="`背景音乐：${sfx.musicOn.value ? '开' : '关'}（b）· ${sfx.catalog.music.tracks[sfx.track.value]?.title ?? ''}（n 切换）`" @click="sfx.toggleMusic()">
      <ph-music-notes-simple />
    </button>
  </span>
</template>

<style scoped>
.sfx-ctl { display: inline-flex; gap: .45rem; align-items: center; }
.sfx-ctl button { background: none; border: 0; padding: 0; color: #6e6e73; cursor: pointer; display: inline-flex; font-size: .82rem; }
.sfx-ctl button:hover, .sfx-ctl button.on { color: #fff; }
</style>
