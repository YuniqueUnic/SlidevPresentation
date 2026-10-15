<script setup lang="ts">
// Polar-style version ranges: which fields/endpoints exist in which version.
// Click i selects versions[i]; the final click (removeAt) shows a retirement.
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const props = defineProps<{
  versions: string[]
  rows: { name: string; kind: 'field' | 'route'; from?: string; to?: string; note?: string }[]
  removeAt?: number // click index that retires versions[0]
}>()
const { $clicks } = useSlideContext()
const removing = computed(() => props.removeAt !== undefined && $clicks.value >= props.removeAt)
const sel = computed(() => (removing.value ? -1 : Math.min($clicks.value, props.versions.length - 1)))
const idx = (v?: string) => (v ? props.versions.indexOf(v) : -1)
function has(r: (typeof props.rows)[number], i: number) {
  const a = r.from ? idx(r.from) : 0
  const b = r.to ? idx(r.to) : props.versions.length - 1
  return i >= a && i <= b
}
const dead = (r: (typeof props.rows)[number]) => removing.value && r.to === props.versions[0]
</script>

<template>
  <div class="rt" :style="{ gridTemplateColumns: `11rem repeat(${props.versions.length}, 1fr)` }">
    <div class="hd" />
    <div v-for="(v, i) in props.versions" :key="v" class="hd ver" :class="{ sel: i === sel, gone: removing && i === 0 }">{{ v }}</div>
    <template v-for="r in props.rows" :key="r.name">
      <div class="nm" :class="{ dead: dead(r) }">
        <ph-brackets-curly v-if="r.kind === 'field'" /><ph-path v-else />
        <code>{{ r.name }}</code>
        <small v-if="r.note">{{ r.note }}</small>
      </div>
      <div v-for="(v, i) in props.versions" :key="v" class="cell" :class="{ sel: i === sel, gone: removing && i === 0 }">
        <span v-if="has(r, i)" class="bar" :class="{ on: i === sel, dead: dead(r) }" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.rt { display: grid; gap: .3rem 0; align-items: center; }
.hd { font-size: .66rem; color: #8e8e93; text-align: center; padding: .3rem 0; font-family: var(--slidev-code-font-family); }
.hd.ver { border-radius: 8px 8px 0 0; transition: all .3s; }
.hd.sel { color: #000; background: #fff; font-weight: 700; }
.hd.gone { text-decoration: line-through; color: #e05252; }
.nm { display: flex; align-items: center; gap: .35rem; font-size: .72rem; color: #d1d1d6; transition: all .3s; }
.nm small { color: #6e6e73; font-size: .62rem; }
.nm.dead { opacity: .35; text-decoration: line-through; }
.cell { height: 1.6rem; display: flex; align-items: center; padding: 0 1px; transition: background .3s; }
.cell.sel { background: rgba(255,255,255,.06); }
.cell.gone { background: rgba(224,82,82,.06); }
.bar { display: block; width: 100%; height: .5rem; border-radius: 3px; background: #3a3a3c; transition: all .3s; }
.bar.on { background: #a6e07a; box-shadow: 0 0 12px rgba(166,224,122,.5); }
.bar.dead { background: #e05252; opacity: .6; }
</style>
