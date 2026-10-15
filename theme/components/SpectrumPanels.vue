<script setup lang="ts">
// The stepped glass panels used on cover slides (blue → white → green → coral).
const panels = [
  ['#5aa9cc', '#3c8bb0'], ['#bfe6f4', '#9fd3e8'], ['#f7fbfd', '#dfeef4'],
  ['#e6f8dc', '#c9eeb6'], ['#cdf2ae', '#b0e48a'], ['#ecec98', '#dcd474'],
  ['#f6c983', '#eaa95f'], ['#f79a72', '#ef7d55'], ['#ea6060', '#c94141'],
]
</script>

<template>
  <div class="panels">
    <span v-for="([a, b], i) in panels" :key="i"
      :style="{ left: `${i * 9}%`, top: `${38 - i * 5}%`, background: `linear-gradient(160deg, ${a}, ${b})` }" />
  </div>
</template>
