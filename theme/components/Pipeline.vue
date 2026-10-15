<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const props = defineProps<{ steps: string[]; offset?: number }>()
const { $clicks } = useSlideContext()
const active = computed(() =>
  Math.max(0, Math.min($clicks.value - (props.offset ?? 0), props.steps.length - 1)),
)
</script>

<template>
  <div class="pipeline">
    <div
      v-for="(s, i) in props.steps"
      :key="i"
      class="step"
      :class="{ active: i === active, done: i < active }"
    >
      <span class="dot"><ph-check-bold v-if="i < active" /><template v-else>{{ i + 1 }}</template></span>
      <span>{{ s }}</span>
    </div>
  </div>
</template>

<style scoped>
.pipeline { display: flex; flex-direction: column; gap: .4rem; position: relative; }
.step {
  display: flex; align-items: center; gap: .65rem;
  padding: .5rem .8rem; border-radius: 999px;
  border: 1px solid #1c1c1e; color: #6e6e73; font-size: .85rem;
  transition: all .4s cubic-bezier(.2,.8,.2,1);
}
.step.done { color: #c7c7cc; border-color: #2c2c2e; }
.step.active {
  color: #fff; border-color: rgba(255,255,255,.85); transform: translateX(8px);
  background: rgba(255,255,255,.04);
  box-shadow: -6px 0 24px -6px rgba(166,224,122,.35), 6px 0 24px -6px rgba(242,132,92,.3);
}
.dot {
  width: 1.45rem; height: 1.45rem; border-radius: 999px; flex: none;
  display: grid; place-items: center; font-size: .72rem; font-weight: 600;
  border: 1px solid #3a3a3c; font-family: var(--slidev-code-font-family);
}
.step.done .dot { background: #f5f5f7; color: #000; border-color: transparent; }
.step.active .dot { background: linear-gradient(135deg, #8fd0ea, #c8f0a8 50%, #f6c879); color: #000; border-color: transparent; }
</style>
