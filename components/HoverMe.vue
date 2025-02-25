<!-- HoverMe.vue -->
<template>
  <HoverShow direction="direction">
    <template #trigger>
      <a v-if="typeof trigger === 'string'" class="text-sm" :class="triggerClass">{{ trigger }}</a>
      <component v-else :is="trigger" />
    </template>
    <template #content>
      <div class="slidev-hover-content" :class="innerClass">
        <p v-if="typeof inner === 'string'" class="m-0" v-html="inner"></p>
        <component v-else :is="inner" />
      </div>
    </template>
  </HoverShow>
</template>

<script>
import HoverShow from './HoverShow.vue';

export default {
  components: {
    HoverShow,
  },
  props: {
    trigger: {
      type: [String, Object], // 允许 String 或 Component
      default: 'Hover Me',
    },
    inner: {
      type: [String, Object], // 允许 String 或 Component
      default: 'Content for HoverMe',
    },
    direction: {
      type: String,
      default: 'up',
      validator: (value) => ['up', 'down', 'left', 'right', null].includes(value),
    },
    triggerClass: {
      type: [String, Object, Array], // 允许 String, Object, 或 Array 形式的 class
      default: '',
    },
    innerClass: {
      type: [String, Object, Array], // 允许 String, Object, 或 Array 形式的 class
      default: '',
    },
  },
};
</script>

<style scoped>
/* 示例样式，可以根据 Slidev 风格进一步调整 */
.slidev-button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
}

.slidev-hover-content {
  font-size: 14px;
  line-height: 1.5;
  /* z-index is now in HoverShow.vue */
  /* position is now in HoverShow.vue */
}
</style>