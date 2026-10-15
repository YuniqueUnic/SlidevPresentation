<script setup lang="ts">
// Step-synced explanation panel: shows steps[$clicks - offset].
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const props = withDefaults(defineProps<{
  steps: { title: string; body: string; tag?: string }[]
  offset?: number
}>(), { offset: 0 })

const { $clicks } = useSlideContext()
const i = computed(() => Math.max(0, Math.min($clicks.value - props.offset, props.steps.length - 1)))
const step = computed(() => props.steps[i.value])
</script>

<template>
  <div class="caption">
    <div class="cap-head">
      <span class="cap-no">{{ String(i + 1).padStart(2, '0') }}<span>/{{ String(props.steps.length).padStart(2, '0') }}</span></span>
      <Transition name="cap" mode="out-in">
        <span :key="i" class="cap-title">{{ step.title }}</span>
      </Transition>
      <span v-if="step.tag" class="cap-tag">{{ step.tag }}</span>
    </div>
    <Transition name="cap" mode="out-in">
      <div :key="i" class="cap-body" v-html="step.body" />
    </Transition>
    <div class="cap-bar"><span :style="{ width: `${((i + 1) / props.steps.length) * 100}%` }" /></div>
  </div>
</template>

<style scoped>
.caption {
  border: 1px solid #1c1c1e; border-radius: 14px; padding: .75rem 1rem .9rem;
  background: linear-gradient(180deg, #0c0c0d, #070707); position: relative; overflow: hidden;
}
.cap-head { display: flex; align-items: center; gap: .6rem; margin-bottom: .35rem; }
.cap-no { font-family: var(--slidev-code-font-family); font-size: .72rem; color: #fff; font-weight: 600; }
.cap-no span { color: #6e6e73; }
.cap-title { font-weight: 600; color: #fff; font-size: .9rem; }
.cap-tag { margin-left: auto; font-size: .66rem; padding: .1rem .55rem; border-radius: 999px; border: 1px solid #3a3a3c; color: #c7c7cc; }
.cap-body { font-size: .78rem; line-height: 1.6; color: #c7c7cc; min-height: 2.6rem; }
.cap-body :deep(code) { font-size: .88em; padding: .05em .35em; border-radius: 5px; background: #151517; border: 1px solid #2c2c2e; color: #fff; }
.cap-body :deep(b) { color: #fff; }
.cap-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: #151517; }
.cap-bar span { display: block; height: 100%; background: linear-gradient(90deg, #4a9fc4, #b4e98d, #f4b36a, #f2845c); transition: width .4s ease; }
.cap-enter-active, .cap-leave-active { transition: all .22s ease; }
.cap-enter-from { opacity: 0; transform: translateY(4px); }
.cap-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
