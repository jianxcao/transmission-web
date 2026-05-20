<template>
  <div class="canvas-list-warpper" ref="canvasListWrapperRef">
    <div class="canvas-list-container" ref="canvasListContainerRef" @scroll="onScroll">
      <ToolbarView v-if="isMobile" />
      <ListHeader
        v-model:showHeaderMenu="showHeaderMenu"
        is-sticky-select-all
        :style="{ top: isMobile ? TOOLBAR_HEIGHT + 'px' : '0px' }"
      />
      <CanvasTableBody ref="canvasTableBodyRef" />
      <div
        tabindex="-1"
        :style="{ height: tableStore.scrollHeight + 'px', width: torrentStore.tableMinWidth + 'px' }"
        class="canvas-list-scroll-holder"
        @mousemove="canvasTableBodyRef?.onMouseMove"
        @mouseleave="canvasTableBodyRef?.onMouseLeave"
        @contextmenu="canvasTableBodyRef?.onRowContextMenu"
        @keydown="canvasTableBodyRef?.onKeyDown"
        @click="canvasTableBodyRef?.onRowClick"
        v-touch="{ preventDefault: false }"
        @press="onLongtap"
      ></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { useTorrentStore } from '@/store'
import type { AnyTouchEvent } from 'any-touch'
import CanvasTableBody from './CanvasTableBody.vue'
import { useTableStore } from './store/tableStore'
import { TOOLBAR_HEIGHT } from './store/utils'

const props = defineProps<{
  listHeight: number
}>()
// 移除 useThrottleFn 的引入
const showHeaderMenu = ref(false)
const bodyRef = ref(document.body)
const torrentStore = useTorrentStore()
const tableStore = useTableStore()
const canvasTableBodyRef = useTemplateRef<InstanceType<typeof CanvasTableBody>>('canvasTableBodyRef')
const canvasListWrapperRef = useTemplateRef<HTMLElement>('canvasListWrapperRef')
const canvasListContainerRef = useTemplateRef<HTMLElement>('canvasListContainerRef')
const bodyHeight = ref(document.body.clientHeight || document.documentElement.clientHeight)
const isMobile = useIsSmallScreen()

onMounted(() => {
  canvasListContainerRef.value!.scrollTop = tableStore.scrollTop
})

watch(
  () => props.listHeight,
  (newHeight) => {
    if (canvasListContainerRef.value) {
      canvasListContainerRef.value.style.height = newHeight + 'px'
    } else {
      nextTick(() => {
        if (canvasListContainerRef.value) {
          canvasListContainerRef.value.style.height = newHeight + 'px'
        }
      })
    }
    // 去掉固定的table header
    tableStore.setClientHeight(newHeight - tableStore.viewTop)
  },
  {
    immediate: true
  }
)

let rafId: number | null = null
let lastScrollEvent: Event | null = null

function onScrollRaw(e: Event) {
  const target = e.target as HTMLElement
  tableStore.setScroll(target.scrollTop, target.scrollLeft)
}

// 优化的滚动事件处理，添加防抖
function onScroll(e: Event) {
  lastScrollEvent = e
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  rafId = requestAnimationFrame(() => {
    if (lastScrollEvent) {
      onScrollRaw(lastScrollEvent)
      lastScrollEvent = null
    }
    rafId = null
  })
}

// 添加组件销毁时的清理逻辑
onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  lastScrollEvent = null
})

useResizeObserver(bodyRef, () => {
  bodyHeight.value = bodyRef.value?.clientHeight!
})

useResizeObserver([canvasListWrapperRef], () => {
  tableStore.setClientWidth(canvasListWrapperRef.value?.clientWidth!)
})

onMounted(() => {
  tableStore.setClientWidth(canvasListWrapperRef.value?.clientWidth!)
})

function onLongtap(e: AnyTouchEvent) {
  canvasTableBodyRef.value?.handleLongtap(e)
}

function scrollToTorrent(id: number | null) {
  if (id === null || !canvasListContainerRef.value) {
    return
  }
  const index = torrentStore.filterTorrents.findIndex((torrent) => torrent.id === id)
  if (index < 0) {
    return
  }
  const heights = tableStore.cumulativeHeights.heights
  const top = index === 0 ? 0 : heights[index - 1] || 0
  const bottom = heights[index] || top
  const visibleTop = canvasListContainerRef.value.scrollTop
  const visibleBottom = visibleTop + tableStore.clientHeight
  if (bottom > visibleTop && top < visibleBottom) {
    return
  }
  canvasListContainerRef.value.scrollTop = top
  tableStore.setScroll(top, canvasListContainerRef.value.scrollLeft)
}

watch(
  () => torrentStore.scrollToTorrentRequest,
  async () => {
    await nextTick()
    scrollToTorrent(torrentStore.scrollToTorrentId)
  },
  { flush: 'post' }
)

// const scrollContainer = ref<HTMLElement>(document.body)
// useResizeObserver(scrollContainer, () => {
//   listheight.value = document.documentElement.clientHeight - 56 - 32
// })
</script>
<style lang="less" scoped>
@import '@/styles/mix.less';
.canvas-list-warpper {
  position: relative;
  overflow: hidden;
  background-color: var(--table-color);
}
.canvas-list-container {
  width: 100%;
  overflow: auto;
  position: relative;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  padding-right: 4px;
  z-index: 2;
  .scrollbar();
}
.canvas-list-scroll-holder {
  position: absolute;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  top: 0;
  left: 0;
  cursor: pointer;
  z-index: 1;
}
</style>
