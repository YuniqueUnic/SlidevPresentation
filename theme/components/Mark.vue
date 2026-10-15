<script setup lang="ts">
// A status line: icon + text. No emoji; Phosphor icons only.
defineProps<{ t: 'ok' | 'no' | 'warn' | 'fix' | 'add' | 'info' }>()
</script>

<template>
  <div class="mark-line" :class="t">
    <ph-check-circle-fill v-if="t === 'ok'" />
    <ph-x-circle-fill v-else-if="t === 'no'" />
    <ph-warning-fill v-else-if="t === 'warn'" />
    <ph-pencil-simple-line-fill v-else-if="t === 'fix'" />
    <ph-plus-circle-fill v-else-if="t === 'add'" />
    <ph-info-fill v-else />
    <span><slot /></span>
  </div>
</template>
