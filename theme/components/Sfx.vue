<script setup lang="ts">
// Play a named sound when the slide reaches a click step.
//   <Sfx name="error" :at="1" />      plays when $clicks becomes 1
//   <Sfx name="success" />            plays when the slide opens
import { computed, watch } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'
import { useSfx, type SfxName } from '../composables/useSfx'

const props = withDefaults(defineProps<{ name: SfxName; at?: number }>(), { at: 0 })
const { $page, $clicks } = useSlideContext()
const { currentSlideNo, isPrintMode } = useNav()
const sfx = useSfx()
const hit = computed(() => currentSlideNo.value === $page.value && $clicks.value === props.at)
watch(hit, (v) => { if (v && !isPrintMode.value) setTimeout(() => sfx.play(props.name), 140) })
</script>

<template><span class="hidden" /></template>
