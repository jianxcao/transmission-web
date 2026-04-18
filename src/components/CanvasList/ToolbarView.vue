<template>
  <div class="toolbar-view">
    <div class="left flex items-center">
      <n-icon
        v-if="toolbarStore.listType === 'table'"
        :component="toolbarStore.selectMode ? DashCheckedIcon : DashCheckIcon"
        size="20"
        :color="toolbarStore.selectMode ? 'var(--primary-color)' : 'var(--text-color-disabled)'"
        @click="onSelectModeClick"
        class="cursor-pointer"
      />
    </div>
    <div class="right flex gap-2 items-center">
      <n-icon
        :component="DataTableIcon"
        size="20"
        :color="toolbarStore.listType === 'table' ? 'var(--primary-color)' : 'var(--text-color-disabled)'"
        @click="toolbarStore.setListType('table')"
        class="cursor-pointer"
      />
      <n-icon
        :component="ListIcon"
        size="20"
        :color="toolbarStore.listType === 'card' ? 'var(--primary-color)' : 'var(--text-color-disabled)'"
        @click="toolbarStore.setListType('card')"
        class="cursor-pointer"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import useToolbarStore from './store/toolbarStore'
import DataTableIcon from '@/assets/icons/dataTable.svg?component'
import DashCheckIcon from '@/assets/icons/dashCheck.svg?component'
import DashCheckedIcon from '@/assets/icons/dashChecked.svg?component'
import ListIcon from '@/assets/icons/list.svg?component'
import { useTorrentStore } from '@/store'
const toolbarStore = useToolbarStore()
const torrentStore = useTorrentStore()

function onSelectModeClick() {
  console.log('onSelectModeClick')
  toolbarStore.setSelectMode(!toolbarStore.selectMode)
  if (!toolbarStore.selectMode) {
    torrentStore.clearSelectedKeys()
  }
}
</script>

<style scoped lang="less">
.toolbar-view {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-inline: 4px;
  background-color: var(--card-color);
  border-bottom: 1px solid var(--border-color);
  gap: 12px;
  height: 32px;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 999;
}
</style>
