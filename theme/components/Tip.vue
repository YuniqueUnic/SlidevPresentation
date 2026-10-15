<script setup lang="ts">
// A tooltip bubble shown for a range of clicks. Place it in a column next to
// the code so it never covers content; `top` aligns the arrow with the lines.
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const props = withDefaults(defineProps<{
  at: number | [number, number]
  top?: string
  title?: string
  tone?: 'info' | 'ok' | 'warn' | 'gen' | 'ours'
  arrow?: 'left' | 'none'
}>(), { top: '0', tone: 'info', arrow: 'left' })

const { $clicks } = useSlideContext()
const show = computed(() => {
  const [a, b] = Array.isArray(props.at) ? props.at : [props.at, props.at]
  return $clicks.value >= a && $clicks.value <= b
})
</script>

<template>
  <Transition name="tip">
    <div v-if="show" class="tip" :class="[tone, `arrow-${arrow}`]" :style="{ top }">
      <div v-if="title" class="tip-title">
        <ph-lightbulb-filament v-if="tone === 'info'" />
        <ph-check-circle v-else-if="tone === 'ok'" />
        <ph-warning v-else-if="tone === 'warn'" />
        <ph-gear-six v-else-if="tone === 'gen'" />
        <ph-user-circle v-else />
        {{ title }}
      </div>
      <div class="tip-body"><slot /></div>
    </div>
  </Transition>
</template>

<style scoped>
.tip {
  position: absolute; left: 0; right: 0;
  background: #101011; border: 1px solid rgba(255,255,255,.16); border-radius: 12px;
  padding: .6rem .8rem; font-size: .74rem; line-height: 1.5; color: #d1d1d6;
  box-shadow: 0 12px 40px -12px rgba(0,0,0,.8);
}
.tip.arrow-left::before {
  content: ""; position: absolute; left: -7px; top: 14px; width: 12px; height: 12px;
  background: #101011; border-left: 1px solid rgba(255,255,255,.16); border-bottom: 1px solid rgba(255,255,255,.16);
  transform: rotate(45deg);
}
.tip-title { display: flex; align-items: center; gap: .35rem; font-weight: 600; color: #fff; margin-bottom: .2rem; font-size: .78rem; }
.tip.ok .tip-title svg { color: #a6e07a; }
.tip.warn .tip-title svg { color: #e8d978; }
.tip.gen .tip-title svg { color: #a6e07a; }
.tip.ours .tip-title svg { color: #f2845c; }
.tip.info .tip-title svg { color: #8fd0ea; }
.tip-body :deep(code) { font-size: .9em; }
.tip-enter-active, .tip-leave-active { transition: all .3s ease; }
.tip-enter-from, .tip-leave-to { opacity: 0; transform: translateX(8px); }
</style>
