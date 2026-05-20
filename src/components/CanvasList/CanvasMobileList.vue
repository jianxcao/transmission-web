<template>
  <div class="canvas-mobile-list-wrapper" ref="canvasMobileListWrapperRef">
    <div class="canvas-mobile-list-container" ref="canvasMobileListContainerRef" @scroll="onScroll">
      <ToolbarView />
      <CanvasTableMobileBody ref="canvasTableMobileBodyRef" />
      <div
        tabindex="-1"
        ref="scrollHolderRef"
        :style="{ height: cardStore.scrollHeight + 'px', width: '100%' }"
        class="canvas-mobile-list-scroll-holder"
        @mousemove="canvasTableMobileBodyRef?.onMouseMove"
        @mouseleave="canvasTableMobileBodyRef?.onMouseLeave"
        @click="canvasTableMobileBodyRef?.onRowClick"
        v-touch="{ preventDefault: false }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTorrentStore } from '@/store'
import CanvasTableMobileBody from './CanvasTableMobileBody.vue'
import { useCardStore } from './store/cardStore'
import { TOOLBAR_HEIGHT } from './store/utils'

const props = defineProps<{
  listHeight: number
}>()

const cardStore = useCardStore()
const torrentStore = useTorrentStore()
const canvasTableMobileBodyRef = useTemplateRef<InstanceType<typeof CanvasTableMobileBody>>('canvasTableMobileBodyRef')
const scrollHolderRef = useTemplateRef<HTMLElement>('scrollHolderRef')
const canvasMobileListWrapperRef = useTemplateRef<HTMLElement>('canvasMobileListWrapperRef')
const canvasMobileListContainerRef = useTemplateRef<HTMLElement>('canvasMobileListContainerRef')
const bodyRef = ref(document.body)
const bodyHeight = ref(document.body.clientHeight || document.documentElement.clientHeight)

onMounted(() => {
  canvasMobileListContainerRef.value!.scrollTop = cardStore.scrollTop
})

watch(
  () => props.listHeight,
  (newHeight) => {
    if (canvasMobileListContainerRef.value) {
      canvasMobileListContainerRef.value.style.height = newHeight + 'px'
    } else {
      nextTick(() => {
        if (canvasMobileListContainerRef.value) {
          canvasMobileListContainerRef.value.style.height = newHeight + 'px'
        }
      })
    }
    cardStore.setClientHeight(newHeight - TOOLBAR_HEIGHT)
  },
  {
    immediate: true
  }
)

let rafId: number | null = null
let lastScrollEvent: Event | null = null

function onScrollRaw(e: Event) {
  const target = e.target as HTMLElement
  cardStore.setScroll(target.scrollTop, 0) // 移动端不需要水平滚动
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

useResizeObserver([canvasMobileListWrapperRef], () => {
  cardStore.setClientWidth(scrollHolderRef.value?.clientWidth!)
})

onMounted(() => {
  cardStore.setClientWidth(scrollHolderRef.value?.clientWidth!)
})

function scrollToTorrent(id: number | null) {
  if (id === null || !canvasMobileListContainerRef.value) {
    return
  }
  const index = torrentStore.filterTorrents.findIndex((torrent) => torrent.id === id)
  if (index < 0) {
    return
  }
  const heights = cardStore.cumulativeHeights.heights
  const top = index === 0 ? 0 : heights[index - 1] || 0
  const bottom = heights[index] || top
  const visibleTop = canvasMobileListContainerRef.value.scrollTop
  const visibleBottom = visibleTop + cardStore.clientHeight
  if (bottom > visibleTop && top < visibleBottom) {
    return
  }
  canvasMobileListContainerRef.value.scrollTop = top
  cardStore.setScroll(top, 0)
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

<style lang="less" scoped>
@import '@/styles/mix.less';
.canvas-mobile-list-wrapper {
  position: relative;
  overflow: hidden;
  background-color: var(--body-color);
  width: 100vw;
}

.canvas-mobile-list-container {
  width: 100%;
  overflow: auto;
  position: relative;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  z-index: 2;
  .scrollbar();
}

.canvas-mobile-list-scroll-holder {
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
