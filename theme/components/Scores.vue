<script setup lang="ts">
// Animated 0–5 bars; bars fill when the slide becomes active.
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const props = defineProps<{ items: { label: string; value: number; note?: string }[] }>()
const { $page, $nav } = useSlideContext()
const active = computed(() => $nav.value.currentSlideNo === $page.value)
const tone = (v: number) => (v >= 4 ? 'g' : v >= 2 ? 'y' : 'r')
</script>

<template>
  <div class="scores">
    <div v-for="(it, i) in props.items" :key="it.label" class="sc">
      <div class="lb"><span>{{ it.label }}</span><b>{{ it.value }}/5</b></div>
      <div class="track"><div class="fill" :class="tone(it.value)" :style="{ width: active ? `${it.value * 20}%` : '0%', transitionDelay: `${i * 120}ms` }" /></div>
      <div v-if="it.note" class="nt">{{ it.note }}</div>
    </div>
  </div>
</template>

<style scoped>
.scores { display: flex; flex-direction: column; gap: .55rem; }
.lb { display: flex; justify-content: space-between; font-size: .72rem; color: #c7c7cc; }
.lb b { color: #fff; font-family: var(--slidev-code-font-family); font-size: .68rem; }
.track { height: 7px; border-radius: 99px; background: #1c1c1e; overflow: hidden; margin-top: .2rem; }
.fill { height: 100%; border-radius: 99px; transition: width 1s cubic-bezier(.2,.8,.2,1); }
.fill.g { background: linear-gradient(90deg, #7cc95a, #b4e98d); }
.fill.y { background: linear-gradient(90deg, #d9b84f, #e8d978); }
.fill.r { background: linear-gradient(90deg, #c94141, #f2845c); }
.nt { font-size: .62rem; color: #6e6e73; margin-top: .15rem; }
</style>
