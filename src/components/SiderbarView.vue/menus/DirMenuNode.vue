<template>
  <div>
    <div class="dir-menu-row" :class="{ 'is-selected': selectedKey === option.key }" :style="rowStyle">
      <button type="button" class="dir-menu-select" @click="emit('select', option.key)">
        <n-icon :component="Folder" :size="16" />
        <span class="dir-menu-label">{{ option.label }}</span>
      </button>
      <button
        v-if="hasChildren"
        type="button"
        class="dir-menu-arrow-button"
        :aria-label="option.label"
        :aria-expanded="expanded"
        @click="emit('toggle', option.key)"
      >
        <n-icon class="dir-menu-arrow" :class="{ 'is-expanded': expanded }" :component="ChevronForward" :size="14" />
      </button>
    </div>
    <div v-show="hasChildren && expanded">
      <DirMenuNode
        v-for="child in option.dirChildren"
        :key="child.key"
        :option="child"
        :depth="depth + 1"
        :selected-key="selectedKey"
        :expanded-keys="expandedKeys"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import type { IDirMenuOption } from '@/store/torrentUtils'
import { ChevronForward, Folder } from '@vicons/ionicons5'

const props = defineProps<{
  option: IDirMenuOption
  depth: number
  selectedKey: string
  expandedKeys: Set<string>
}>()

const emit = defineEmits<{
  select: [key: string]
  toggle: [key: string]
}>()

const hasChildren = computed(() => Boolean(props.option.dirChildren?.length))
const expanded = computed(() => props.expandedKeys.has(props.option.key))
const rowStyle = computed(() => ({ paddingLeft: `${32 + props.depth * 14}px` }))
</script>

<style lang="less" scoped>
.dir-menu-row {
  gap: 0;
  padding-right: 4px;
}

.dir-menu-select,
.dir-menu-arrow-button {
  display: flex;
  align-items: center;
  height: 32px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.dir-menu-select {
  flex: 1;
  gap: 8px;
  min-width: 0;
  padding: 0;
  text-align: left;
}

.dir-menu-arrow-button {
  flex: none;
  justify-content: center;
  width: 24px;
  padding: 0;
}
</style>
