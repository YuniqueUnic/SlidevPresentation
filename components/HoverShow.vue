<!-- HoverShow.vue -->
<template>
  <div
    class="hover-container"
    @mouseenter="handleMouseenter"
    @mouseleave="handleMouseleave"
    ref="container"
  >
    <slot name="trigger"></slot>
    <div
      v-if="showHover"
      class="hover-content"
      ref="content"
      :style="hoverContentStyle"
    >
      <slot name="content"></slot>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch, toRef } from 'vue';

export default {
  name: 'HoverComponent',
  props: {
    /**
     * Specify the popup direction, if provided, the popup direction will follow this direction.
     * Otherwise, it will be automatically adjusted based on screen space.
     * 可选值：'up', 'down', 'left', 'right', null (默认：自动调整)
     */
    direction: {
      type: String,
      default: null, // 默认 null 表示自动调整
      validator: (value) => ['up', 'down', 'left', 'right', null].includes(value),
    },
  },
  setup(props) {
    const showHover = ref(false);
    const container = ref(null);
    const content = ref(null);
    const hoverContentStyle = reactive({});
    const directionProp = toRef(props, 'direction'); // Create a ref for props.direction

    const handleMouseenter = () => {
      showHover.value = true;
      adjustPosition();
    };

    const handleMouseleave = () => {
      showHover.value = false;
      resetPosition();
    };

    const adjustPosition = () => {
      if (!container.value || !content.value) return;

      const containerRect = container.value.getBoundingClientRect();
      const contentRect = content.value.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Reset styles at the beginning of adjustPosition
      resetPosition();

      let preferredDirection = props.direction || 'down'; // Default to 'down' if no direction prop

      if (!props.direction) { // Only auto-adjust if direction prop is not provided
        if (containerRect.bottom + contentRect.height > viewportHeight) {
          preferredDirection = 'up'; // Adjust to 'up' if going down exceeds viewport
        }
      }

      switch (preferredDirection) {
        case 'up':
          hoverContentStyle.top = 'auto';
          hoverContentStyle.bottom = '100%';
          hoverContentStyle.left = '0';
          break;
        case 'down':
          hoverContentStyle.top = '100%';
          hoverContentStyle.bottom = 'auto';
          hoverContentStyle.left = '0';
          break;
        case 'left':
          hoverContentStyle.top = '0';
          hoverContentStyle.left = 'auto';
          hoverContentStyle.right = '100%';
          break;
        case 'right':
          hoverContentStyle.top = '0';
          hoverContentStyle.left = '100%';
          hoverContentStyle.right = 'auto';
          break;
      }
    };

    const resetPosition = () => {
      // Reset all dynamic styles to ensure no interference
      hoverContentStyle.top = '';
      hoverContentStyle.bottom = '';
      hoverContentStyle.left = '';
      hoverContentStyle.right = '';
    };

    // Watch for direction prop changes and re-adjust position
    watch(directionProp, () => {
      if (showHover.value) {
        adjustPosition();
      } else {
        resetPosition();
      }
    });

    return {
      showHover,
      container,
      content,
      hoverContentStyle,
      handleMouseenter,
      handleMouseleave,
    };
  },
};
</script>

<style scoped>
.hover-container {
  position: relative; /* Change to relative for better stacking context control */
  display: inline; /* Or inline-flex if you need more control over trigger alignment */
}

.hover-content {
  position: fixed; /* Keep absolute positioning for popup content */
  z-index: 9999; /* High z-index to be on top */
  background-color: #f9f9f9;
  border: 1px solid #eaeaea;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 220px;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  line-height: 1.15;
}
</style>