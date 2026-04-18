<template>
  <div
    class="torrent-table-header flex"
    @contextmenu.prevent="onTableHeaderContextMenu"
    ref="headerRef"
    :style="{ ...style, width: width }"
  >
    <div
      class="torrent-table-header-cell-checkbox"
      :class="{ 'torrent-table-header-cell-checkbox-sticky': isStickySelectAll }"
      v-if="toolbarStore.selectMode"
    >
      <n-checkbox
        :checked="torrentStore.selectedKeys.length === torrentStore.filterTorrents.length"
        @update:checked="onCheckboxChange"
      />
    </div>
    <div class="torrent-table-header-cell-wrapper">
      <div
        v-for="(col, colIdx) in visibleColumns"
        :key="col.key"
        class="torrent-table-header-cell"
        :style="{ width: col.width + 'px', position: 'relative' }"
      >
        <div
          class="flex items-center gap-1 cursor-pointer"
          v-touch
          @tap="() => onColumnClick(col.key)"
          @press="(e: any) => longtap(e)"
        >
          <n-icon
            v-if="torrentStore.sortKey === col.key"
            :component="torrentStore.sortOrder === 'asc' ? CaretUp : CaretDown"
          />
          {{ getTitle(col.key) }}
        </div>
        <div
          v-if="colIdx < visibleColumns.length"
          class="col-resizer"
          @mousedown="onResizerMouseDown($event, col)"
          @touchstart="onResizerTouchStart($event, col)"
          @touchmove="onResizerTouchMove($event)"
          @touchend="onResizerTouchEnd($event)"
        ></div>
      </div>
    </div>
  </div>
  <div v-if="resizing" class="col-resize-line" :style="{ left: resizeLineX + 'px' }"></div>
  <HeaderMenu v-model:show="showColumnMenu" :x="columnMenuX" :y="columnMenuY" />
</template>
<script setup lang="ts">
import { allColumns } from '@/composables/useColumns'
import { useTorrentStore } from '@/store'
import useToolbarStore from '@/components/CanvasList/store/toolbarStore'
import { CaretDown, CaretUp } from '@vicons/ionicons5'
import type { AnyTouchEvent } from 'any-touch'
import type { CSSProperties } from 'vue'

withDefaults(
  defineProps<{
    isStickySelectAll?: boolean
    style?: CSSProperties
  }>(),
  {
    isStickySelectAll: false
  }
)
// const emit = defineEmits(['contextmenu']) // 不再需要
const torrentStore = useTorrentStore()
const toolbarStore = useToolbarStore()
const visibleColumns = computed(() => torrentStore.visibleColumns)
const tableMinWidth = computed(() => torrentStore.tableMinWidth)
const width = computed(() => {
  return (toolbarStore.selectMode ? tableMinWidth.value + 24 : tableMinWidth.value) + 'px'
})
const minColumnWidth = computed(() => {
  return allColumns.reduce(
    (min, col) => {
      return { ...min, [col.key]: col.minWidth || 80 }
    },
    {} as Record<string, number>
  )
})
function getMinWidth(key: any) {
  return minColumnWidth.value[key] || 80
}

function getTitle(key: string) {
  return torrentStore.getColumnTitle(key)
}
const resizing = ref(false)
const resizeColKey = ref<string | null>(null)
const startX = ref(0)
const startWidth = ref(0)
const resizeLineX = ref(0)
const headerRef = ref<HTMLElement | null>(null)
const headerLeft = ref(0)
// 表头菜单相关
const showColumnMenu = defineModel<boolean>('showHeaderMenu', { default: false })
const columnMenuX = ref(0)
const columnMenuY = ref(0)

function onResizerTouchStart(e: TouchEvent, col: { key: string; width: number }) {
  e.preventDefault()
  e.stopPropagation()
  if (e.touches.length !== 1) {
    return
  }
  const dom = e.target as HTMLElement
  dom.classList.add('active')
  resizing.value = true
  resizeColKey.value = col.key
  startX.value = e.touches[0].clientX
  startWidth.value = col.width
  if (headerRef.value) {
    headerLeft.value = headerRef.value.getBoundingClientRect().left
  } else {
    headerLeft.value = 0
  }
  resizeLineX.value = e.touches[0].clientX - headerLeft.value
  document.body.style.cursor = 'col-resize'
}

function onResizerTouchMove(e: TouchEvent) {
  if (!resizing.value || e.touches.length !== 1) {
    return
  }
  resizeLineX.value = e.touches[0].clientX - headerLeft.value
  const touch = e.changedTouches[0]
  const delta = touch.clientX - startX.value
  const newWidth = Math.max(getMinWidth(resizeColKey.value), startWidth.value + delta)
  if (resizeColKey.value) {
    torrentStore.updateColumnWidth(resizeColKey.value, newWidth)
  }
}

function onResizerTouchEnd(e: TouchEvent) {
  if (!resizing.value) {
    return
  }
  const dom = e.target as HTMLElement
  dom.classList.remove('active')
  const touch = e.changedTouches[0]
  const delta = touch.clientX - startX.value
  const newWidth = Math.max(getMinWidth(resizeColKey.value), startWidth.value + delta)
  if (resizeColKey.value) {
    torrentStore.updateColumnWidth(resizeColKey.value, newWidth)
  }
  resizing.value = false
  resizeColKey.value = null
  document.body.style.cursor = ''
}

function onResizerMouseDown(e: MouseEvent, col: { key: string; width: number }) {
  resizing.value = true
  resizeColKey.value = col.key
  startX.value = e.clientX
  startWidth.value = col.width
  if (headerRef.value) {
    headerLeft.value = headerRef.value.getBoundingClientRect().left
  } else {
    headerLeft.value = 0
  }
  resizeLineX.value = e.clientX - headerLeft.value
  document.body.style.cursor = 'col-resize'
  window.addEventListener('mousemove', onResizerMouseMove)
  window.addEventListener('mouseup', onResizerMouseUp)
}

function onResizerMouseMove(e: MouseEvent) {
  if (!resizing.value) {
    return
  }
  resizeLineX.value = e.clientX - headerLeft.value
  const delta = e.clientX - startX.value
  const newWidth = Math.max(getMinWidth(resizeColKey.value), startWidth.value + delta)
  if (resizeColKey.value) {
    torrentStore.updateColumnWidth(resizeColKey.value, newWidth)
  }
}

function onResizerMouseUp(e: MouseEvent) {
  if (!resizing.value) {
    return
  }
  const delta = e.clientX - startX.value
  const newWidth = Math.max(getMinWidth(resizeColKey.value), startWidth.value + delta)
  if (resizeColKey.value) {
    torrentStore.updateColumnWidth(resizeColKey.value, newWidth)
  }
  resizing.value = false
  resizeColKey.value = null
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', onResizerMouseMove)
  window.removeEventListener('mouseup', onResizerMouseUp)
}

function onTableHeaderContextMenu(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  showColumnMenu.value = true
  columnMenuX.value = e.clientX
  columnMenuY.value = e.clientY
}

function longtap(e: AnyTouchEvent) {
  showColumnMenu.value = true
  columnMenuX.value = e.x
  columnMenuY.value = e.y
}

function onColumnClick(key: string) {
  torrentStore.setSort(key)
}

function onCheckboxChange(checked: boolean) {
  if (checked) {
    torrentStore.setSelectedKeys(torrentStore.filterTorrents.map((t) => t.id))
  } else {
    torrentStore.clearSelectedKeys()
  }
}
</script>
<style lang="less" scoped>
.torrent-table-header {
  border-bottom: 1px solid var(--border-color);
  padding: 4px 0;
  background: var(--table-color);
  display: flex;
  flex-direction: row;
  position: sticky;
  top: 0;
  z-index: 1000;
}
.torrent-table-header-cell-checkbox {
  background: var(--table-color);
  width: 24px;
  padding-inline: 4px;
}
.torrent-table-header-cell-checkbox-sticky {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 1002;
}
.torrent-table-header-cell-wrapper {
  display: flex;
  flex-direction: row;
  flex: 1;
}

.torrent-table-header-cell {
  user-select: none;
  -webkit-touch-callout: none; /* iOS Safari */
  -webkit-user-select: none; /* Safari */
  font-weight: bold;
  padding-inline: 4px;
  text-align: left;
  text-indent: 12px;
  position: relative;
  background: var(--table-color);
  flex-shrink: 0;
  flex-grow: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-wrap: nowrap;
  word-break: keep-all;
}

.col-resizer {
  position: absolute;
  right: -4px;
  top: 0;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 2;
  background: transparent;
  transition: background 0.2s;
  &:hover {
    background-color: var(--border-color);
  }

  &:after {
    content: '';
    display: block;
    position: absolute;
    left: 3px;
    top: 0;
    width: 2px;
    height: 100%;
    background: #888;
    opacity: 0.5;
  }
  &.active {
    background: var(--primary-color);

    &:after {
      background: var(--primary-color);
      opacity: 1;
    }
  }
}

.col-resize-line {
  position: absolute;
  top: 0;
  width: 0px;
  border-right: 1px dashed var(--primary-color);
  height: 100vh;
  z-index: 9999;
  pointer-events: none;
  transform: translateX(-50%);
}
</style>
