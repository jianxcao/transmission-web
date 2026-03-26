<template>
  <aside :class="['h-full w-full sidebar-view', props.class]">
    <StatusMenu />
    <LabelMenu />
    <DirMenu />
    <TrackerMenu />
    <ErrMenu />
    <StatsMenu />
  </aside>
</template>
<script setup lang="ts">
const props = defineProps<{
  class: string
}>()
</script>

<style lang="less">
.sidebar-view {
  user-select: none;
  -webkit-touch-callout: none; /* iOS Safari */
  -webkit-user-select: none; /* Safari */
  .n-menu-item {
    height: 32px;
    .n-menu-item-content {
      height: 32px;
      .n-menu-item-content-header {
        height: 32px;
        font-size: 0.8rem;
        margin-top: 4px;
      }
    }
  }
}
</style>
