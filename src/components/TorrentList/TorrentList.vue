<template>
  <div
    tabindex="-1"
    v-touch="{ preventDefault: false }"
    @press="handleLongtap"
    @keydown="onKeyDown"
    @click="onRowClick"
    @contextmenu="onRowContextMenu"
  >
    <!-- 虚拟列表 -->
    <DynamicScroller
      ref="scrollerRef"
      :class="$style['torrent-table-scroll']"
      :style="{ height: props.listHeight, '--tableWidth': tableMinWidth + 'px' }"
      @scroll="handleScroll"
      :items="filteredTorrents"
      key-field="id"
      :min-item-size="ITEM_HEIGHT"
      :listClass="$style['list-wrapper']"
      :item-class="$style['item-wrapper']"
    >
      <template #before>
        <TorrentListHeader v-model:showHeaderMenu="showHeaderMenu" />
      </template>
      <!-- 表头 sticky -->
      <template #default="{ item, index, active, itemWithSize }">
        <TorrentListRow
          :key="item.id"
          :row="item"
          :index="index"
          :active="active"
          :cellHeight="itemWithSize.size"
          :selected="torrentStore.selectedKeys.includes(item.id)"
          :style="{ width: tableMinWidth + 'px' }"
        />
      </template>
    </DynamicScroller>
  </div>
  <RowMenu v-model:show="showDropdown" :x="rowMenuX" :y="rowMenuY" :to="`.${$style['torrent-table-scroll']}`" />
</template>
<script setup lang="ts">
import { useTorrentStore } from '@/store'
import { isMac } from '@/utils/index'
import type { AnyTouchEvent } from 'any-touch'
import { DynamicScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

const props = defineProps<{
  listHeight: number
}>()
const torrentStore = useTorrentStore()
const showDropdown = ref(false)
const showHeaderMenu = ref(false)
const rowMenuX = ref(0)
const rowMenuY = ref(0)
const tableMinWidth = computed(() => torrentStore.tableMinWidth)
const scrollerRef = ref<{ $el?: HTMLElement; scrollToItem: (index: number) => void } | null>(null)

// 直接使用 store 的过滤结果
const filteredTorrents = computed(() => torrentStore.filterTorrents)

const ITEM_HEIGHT = 32

// 多选逻辑
function onRowClick(e: MouseEvent | TouchEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.torrent-row-cell-checkbox')) {
    return
  }
  const torrentRow = target.closest('.torrent-row[data-torrent-id]')
  if (!torrentRow) {
    return
  }
  const torrentId = Number(torrentRow.getAttribute('data-torrent-id'))
  if (!torrentId) {
    return
  }
  const index = filteredTorrents.value.findIndex((t) => t.id === torrentId)
  const isCtrl = e.ctrlKey
  const isCmd = e.metaKey
  const isShift = e.shiftKey
  if (isShift) {
    // shift 连选时，无论当前行是否已选中，都以该行为新的终点重新计算范围
    torrentStore.selectRange(index)
  } else if ((isMac() && isCmd) || (!isMac && isCtrl)) {
    torrentStore.toggleSelectedKey(torrentId)
  } else {
    if (torrentStore.mapSelectedKeys[torrentId]) {
      return
    }
    torrentStore.setSelectedKeys([torrentId])
  }
}

function handleScroll() {
  if (showHeaderMenu.value) {
    showHeaderMenu.value = false
  }
}

function onRowContextMenu(e: MouseEvent) {
  e.preventDefault()
  const torrentRow = (e.target as HTMLElement)?.closest('.torrent-row[data-torrent-id]')
  if (!torrentRow) {
    return
  }
  const torrentId = Number(torrentRow.getAttribute('data-torrent-id'))
  if (!torrentId) {
    return
  }
  // 只有未选中时才加入多选集合，已选中时不做任何操作
  if (!torrentStore.selectedKeys.includes(torrentId)) {
    torrentStore.setSelectedKeys([torrentId])
  }
  showDropdown.value = true
  rowMenuX.value = e.clientX
  rowMenuY.value = e.clientY
}

function handleLongtap(e: AnyTouchEvent) {
  e.preventDefault()
  e.stopPropagation()
  const torrentRow = (e.target as HTMLElement)?.closest('.torrent-row[data-torrent-id]')
  if (torrentRow) {
    const torrentId = Number(torrentRow.getAttribute('data-torrent-id'))
    if (torrentId && !torrentStore.selectedKeys.includes(torrentId)) {
      torrentStore.setSelectedKeys([torrentId])
    }
    showDropdown.value = true
    rowMenuX.value = e.x
    rowMenuY.value = e.y
  }
}

function onKeyDown(event: KeyboardEvent) {
  const isCmdOrCtrl = isMac() ? event.metaKey : event.ctrlKey
  const isKeyA = event.key.toLowerCase() === 'a' // 忽略大小写
  if (isCmdOrCtrl && isKeyA) {
    event.preventDefault()
    torrentStore.setSelectedKeys(filteredTorrents.value.map((t) => t.id))
  }
}

function isTorrentVisible(id: number) {
  const container = scrollerRef.value?.$el
  const row = container?.querySelector<HTMLElement>(`.torrent-row[data-torrent-id="${id}"]`)
  if (!container || !row) {
    return false
  }
  const containerRect = container.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  return rowRect.bottom > containerRect.top && rowRect.top < containerRect.bottom
}

function scrollToTorrent(id: number | null) {
  if (id === null || isTorrentVisible(id)) {
    return
  }
  const index = filteredTorrents.value.findIndex((torrent) => torrent.id === id)
  if (index < 0) {
    return
  }
  scrollerRef.value?.scrollToItem(index)
}

watch(
  () => torrentStore.scrollToTorrentRequest,
  async () => {
    await nextTick()
    scrollToTorrent(torrentStore.scrollToTorrentId)
  },
  { flush: 'post' }
)
</script>
<style lang="less"></style>
<style lang="less" module>
@import '@/styles/mix.less';
.torrent-table-scroll {
  box-sizing: border-box;
  overflow: auto;
  position: relative;
  z-index: 1001;
  background-color: var(--table-color);
  .scrollbar();
  .list-wrapper {
    width: var(--tableWidth) !important;
  }

  & :global {
    .vue-recycle-scroller__slot {
      width: var(--tableWidth) !important;
      position: sticky;
      top: 0;
      z-index: 1001;
      background: var(--table-color);
      box-shadow: 0 2px 4px -2px rgba(0, 0, 0, 0.04);
    }
  }
}
</style>
