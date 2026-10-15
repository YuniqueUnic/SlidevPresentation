<script setup lang="ts">
// Stripe-style "walk back through time": light up versions from HEAD back to
// the caller's pinned version, one click per version change module.
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const props = defineProps<{
  versions: { name: string; note?: string }[] // newest first; [0] is HEAD
  changes: string[] // changes[i] sits between versions[i] and versions[i+1]
}>()
const { $clicks } = useSlideContext()
const reached = computed(() => Math.min($clicks.value, props.changes.length))
</script>

<template>
  <div class="wb">
    <template v-for="(v, i) in props.versions" :key="v.name">
      <div class="v" :class="{ on: i <= reached, here: i === reached }">
        <div class="n">{{ v.name }}</div>
        <div v-if="v.note" class="s">{{ v.note }}</div>
      </div>
      <div v-if="i < props.changes.length" class="c" :class="{ on: i < reached }">
        <span class="lbl">{{ props.changes[i] }}</span>
        <span class="line" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.wb { display: flex; align-items: center; gap: 0; }
.v { flex: none; min-width: 7.2rem; border: 1px solid #2c2c2e; border-radius: 12px; padding: .5rem .7rem; background: #0a0a0a; opacity: .45; transition: all .4s ease; }
.v.on { opacity: 1; border-color: #6e6e73; }
.v.here { border-color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,.2), 0 10px 30px -12px rgba(166,224,122,.6); }
.n { font-family: var(--slidev-code-font-family); font-size: .74rem; color: #fff; font-weight: 600; }
.s { font-size: .64rem; color: #8e8e93; margin-top: .1rem; }
.c { flex: 1; min-width: 5rem; display: flex; flex-direction: column; align-items: center; gap: .25rem; padding: 0 .3rem; opacity: .35; transition: opacity .4s; }
.c.on { opacity: 1; }
.lbl { font-size: .62rem; color: #f2845c; font-family: var(--slidev-code-font-family); text-align: center; line-height: 1.3; }
.line { width: 100%; height: 2px; position: relative; background: repeating-linear-gradient(270deg, #8e8e93 0 6px, transparent 6px 12px); background-size: 24px 2px; }
.c.on .line { background: repeating-linear-gradient(270deg, #f2845c 0 6px, transparent 6px 12px); background-size: 24px 2px; animation: wb-flow .8s linear infinite; }
.line::before { content: ""; position: absolute; left: -2px; top: -3px; width: 7px; height: 7px; border-left: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); color: #8e8e93; }
.c.on .line::before { color: #f2845c; }
@keyframes wb-flow { from { background-position: 0 0; } to { background-position: -24px 0; } }
</style>
