<script setup lang="ts">
defineProps<{ kind: 'idl' | 'gen' | 'ours' | 'proposal' }>()
</script>

<template>
  <span class="who" :class="kind">
    <ph-file-code v-if="kind === 'idl'" />
    <ph-gear-six v-else-if="kind === 'gen'" />
    <ph-user-circle v-else-if="kind === 'ours'" />
    <ph-flask v-else />
    <template v-if="kind === 'idl'">我们写 · IDL</template>
    <template v-else-if="kind === 'gen'">xidlc 生成</template>
    <template v-else-if="kind === 'ours'">我们写 · 业务逻辑</template>
    <template v-else>#324 提案形状</template>
  </span>
</template>
