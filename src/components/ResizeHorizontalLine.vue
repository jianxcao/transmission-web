<template>
  <div class="resizer-horizontal" @pointerdown="onResizePointerDown"></div>
</template>

<script setup lang="ts">
import { useVerticalResize } from '@/composables/useVerticalResize'

const props = withDefaults(
  defineProps<{
    minContainerHeight: number
    maxContainerHeight: number
  }>(),
  {}
)

const containerHeight = defineModel<number>('containerHeight', { required: true })
const { onResizePointerDown } = useVerticalResize(containerHeight, props.minContainerHeight, props.maxContainerHeight)
</script>

<style scoped lang="less">
.resizer-horizontal {
  height: 6px;
  cursor: ns-resize;
  background-color: var(--border-color);
  transition: background 0.2s;
  width: 100%;
  z-index: 10;
  // 让浏览器把所有方向的拖动都交给我们处理，避免触屏滚动抢占事件
  touch-action: none;
  -ms-touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.resizer-horizontal:hover,
.resizer-horizontal.active {
  background-color: var(--primary-color);
}
</style>
