<script setup lang="ts">
// Polar's quarterly rotation: Next -> Current -> Deprecated -> removed.
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $clicks } = useSlideContext()
const states = [
  { removed: '', dep: '2025-10', cur: '2026-01', next: '2026-04', title: '4 月发布前' },
  { removed: '2025-10', dep: '2026-01', cur: '2026-04', next: '2026-07', title: '4 月发布后' },
]
const s = computed(() => states[Math.min($clicks.value, 1)])
</script>

<template>
  <div class="rot">
    <div class="title">{{ s.title }}</div>
    <div class="slots">
      <div class="slot gone">
        <div class="h">已删除</div>
        <Transition name="chip" mode="out-in"><div :key="s.removed || 'none'" class="chip">{{ s.removed || '—' }}</div></Transition>
        <div class="d">请求直接返回 404</div>
      </div>
      <div class="slot dep">
        <div class="h">Deprecated · 即将删除</div>
        <Transition name="chip" mode="out-in"><div :key="s.dep" class="chip">{{ s.dep }}</div></Transition>
        <div class="d">冻结；下次发布时删除</div>
      </div>
      <div class="slot cur">
        <div class="h">Current · 默认</div>
        <Transition name="chip" mode="out-in"><div :key="s.cur" class="chip">{{ s.cur }}</div></Transition>
        <div class="d">冻结；不传版本号时用它</div>
      </div>
      <div class="slot next">
        <div class="h">Next · 开发中</div>
        <Transition name="chip" mode="out-in"><div :key="s.next" class="chip">{{ s.next }}</div></Transition>
        <div class="d">所有改动都只进这里</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title { font-size: .74rem; color: #8e8e93; margin-bottom: .5rem; font-weight: 600; letter-spacing: .04em; }
.slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: .6rem; }
.slot { border-radius: 14px; padding: .65rem .75rem; border: 1px solid #2c2c2e; background: #0a0a0a; }
.slot .h { font-size: .68rem; color: #8e8e93; font-weight: 600; }
.slot .d { font-size: .64rem; color: #6e6e73; margin-top: .35rem; }
.chip { margin-top: .4rem; font-family: var(--slidev-code-font-family); font-size: 1.05rem; font-weight: 700; color: #fff; }
.gone { border-style: dashed; } .gone .chip { color: #6e6e73; text-decoration: line-through; }
.dep { border-color: rgba(242,132,92,.5); }
.cur { border-color: rgba(166,224,122,.6); box-shadow: 0 10px 30px -14px rgba(166,224,122,.5); }
.next { border-color: rgba(90,176,216,.55); }
.chip-enter-active, .chip-leave-active { transition: all .35s ease; }
.chip-enter-from { opacity: 0; transform: translateX(14px); }
.chip-leave-to { opacity: 0; transform: translateX(-14px); }
</style>
