<script setup lang="ts">
// Footer: brand / product on the left; sound controls + page number on the right.
// Configure per deck:  themeConfig: { brand: "Photon", product: "API 版本管理" }
import { computed } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'
import SoundFx from './components/SoundFx.vue'

const { currentPage, total, currentLayout } = useNav()
const { $slidev } = useSlideContext()
const cfg = computed(() => ($slidev?.themeConfigs ?? {}) as Record<string, any>)
const bare = computed(() => ['cover', 'end', 'section'].includes(currentLayout.value))
</script>

<template>
  <footer class="deck-footer" :class="{ bare }">
    <span class="brand"><span v-if="cfg.mark" class="mark">{{ cfg.mark }}</span>{{ cfg.brand ?? '' }}<template v-if="cfg.product"><span class="sep">/</span>{{ cfg.product }}</template></span>
    <span class="right">
      <SoundFx />
      <span class="page">{{ String(currentPage).padStart(2, '0') }} <span class="of">/ {{ total }}</span></span>
    </span>
  </footer>
</template>
