<template>
  <n-spin v-if="loading" :show="loading" size="large" class="min-h-screen min-w-screen" />
  <div v-else :class="$style['dashboard-grid']" :style="{ gridTemplateColumns: girdLayout }">
    <!-- Header -->
    <n-layout-header :class="$style.header" bordered>
      <n-button quaternary circle @click="onSidebarToggle">
        <n-icon size="20" :component="LayoutSidebarLeftOpen" />
      </n-button>
      <AppHeader @layoutBottom="onLayoutBottom" />
    </n-layout-header>

    <!-- Sidebar (PC) 可拖拽宽度 -->
    <div v-if="!isMobile" :class="$style['sidebar-container']">
      <SidebarView :class="$style.sidebar" />
      <ResizeLine
        v-model:container-width="settingStore.sidebarWidth"
        :min-container-width="120"
        :max-container-width="600"
      />
    </div>

    <!-- Main Content -->
    <main :class="$style.content">
      <CanvasList v-if="!isMobile || toolbarStore.listType === 'table'" :list-height="listheight" />
      <CanvasMobileList v-else :list-height="listheight" />
      <div v-if="!isMobile" :class="$style['detail-container']" ref="detailContainerRef">
        <template v-if="pcDetailVisible">
          <ResizeHorizontalLine
            v-model:container-height="settingStore.detailHeight"
            :min-container-height="120"
            :max-container-height="600" />
          <TorrentDetail :height="settingStore.detailHeight" :loading="loadingDetail"
        /></template>
      </div>
    </main>

    <!-- Footer -->
    <StatusBar :class="$style.footer" />

    <!-- 移动端 Sidebar 抽屉 -->
    <n-drawer
      v-model:show="drawerVisible"
      placement="left"
      width="85vw"
      to="body"
      v-if="isMobile"
      :mask-closable="true"
      :class="$style['drawer-sidebar']"
    >
      <n-drawer-content>
        <SidebarView :class="$style.sidebar" />
      </n-drawer-content>
    </n-drawer>

    <!-- 移动端 详情抽屉（从右侧） -->
    <n-drawer
      v-if="isMobile"
      v-model:show="mobileDetailVisible"
      placement="right"
      width="92vw"
      to="body"
      :class="$style['drawer-sidebar']"
      :mask-closable="true"
    >
      <n-drawer-content :body-content-class="$style['drawer-mobile-detail']">
        <TorrentDetail closable @close="onCloseDetail" :loading="loadingDetail" />
      </n-drawer-content>
    </n-drawer>
  </div>
</template>
<script setup lang="ts">
import LayoutSidebarLeftOpen from '@/assets/icons/layoutSidebarLeft.svg?component'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { useSettingStore, useStatsStore, useTorrentStore } from '@/store'
import { useSessionStore } from '@/store/session'
import useToolbarStore from '@/components/CanvasList/store/toolbarStore'

const torrentStore = useTorrentStore()
const statsStore = useStatsStore()
const sessionStore = useSessionStore()
const settingStore = useSettingStore()
const loading = ref(true)
const drawerVisible = ref(false)
const isMobile = useIsSmallScreen()
const siderBarVisible = useLocalStorage<boolean>('siderBarVisible', true)
const detailContainerRef = useTemplateRef<HTMLElement>('detailContainerRef')
const pcDetailVisible = useLocalStorage<boolean>('pcDetailVisible', !isMobile.value)
const toolbarStore = useToolbarStore()

const mobileDetailVisible = computed({
  get: () => isMobile.value && torrentStore.selectedKeys.length > 0 && !toolbarStore.selectMode,
  set: (val: boolean) => {
    if (!val) {
      torrentStore.clearSelectedKeys()
    }
  }
})
const loadingDetail = ref(false)

const bodyHeight = ref(document.body.clientHeight || document.documentElement.clientHeight)

// 获取考虑安全区域的可用高度
const getAvailableHeight = () => {
  const viewportHeight = window.innerHeight
  const safeAreaTop = settingStore.safeArea.top
  const safeAreaBottom = settingStore.safeArea.bottom
  return viewportHeight - safeAreaTop - safeAreaBottom
}

// 初始化高度
bodyHeight.value = getAvailableHeight()

// 事件处理函数
const handleResize = () => {
  bodyHeight.value = getAvailableHeight()
}

const listheight = computed(() => {
  const detailHeight = !isMobile.value && pcDetailVisible.value ? settingStore.detailHeight : 0
  return bodyHeight.value - settingStore.headerHeight - settingStore.footerHeight - detailHeight
})

watchEffect(() => {
  if (detailContainerRef.value && pcDetailVisible.value) {
    detailContainerRef.value.style.transform = `translateY(${listheight.value}px)`
  }
})

watch([pcDetailVisible, mobileDetailVisible, () => torrentStore.selectedKeys], () => {
  if (pcDetailVisible.value || mobileDetailVisible.value) {
    loadingDetail.value = true
    torrentStore.fetchDetails().finally(() => {
      loadingDetail.value = false
    })
    torrentStore.startDetailPolling()
  } else {
    torrentStore.stopDetailPolling()
  }
})

const scrollContainer = ref<HTMLElement>(document.body)
useResizeObserver(scrollContainer, () => {
  bodyHeight.value = getAvailableHeight()
})

const girdLayout = computed(() => {
  if (isMobile.value || !siderBarVisible.value) {
    return '0px 1fr'
  }
  return `${settingStore.sidebarWidth}px 1fr`
})

function onSidebarToggle() {
  if (isMobile.value) {
    drawerVisible.value = !drawerVisible.value
  } else {
    siderBarVisible.value = !siderBarVisible.value
  }
}

function onCloseDetail() {
  torrentStore.clearSelectedKeys()
}

function onLayoutBottom() {
  if (isMobile.value) {
    pcDetailVisible.value = false
  } else {
    pcDetailVisible.value = !pcDetailVisible.value
  }
}

onMounted(async () => {
  loading.value = true

  // 设置事件监听器，确保在设备旋转或安全区域变化时更新高度
  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', handleResize)

  torrentStore.startPolling()
  statsStore.startPolling()
  await sessionStore.fetchSession()
  await torrentStore.fetchTorrents()
  await statsStore.fetchStats()
  sessionStore.startPolling()
  loading.value = false
})

onUnmounted(() => {
  torrentStore.stopPolling()
  statsStore.stopPolling()

  // 清理事件监听器
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('orientationchange', handleResize)
})
</script>

<style lang="less" module>
@import '@/styles/mix.less';
.dashboard-grid {
  display: grid;
  grid-template-rows: 56px 1fr 32px;
  box-sizing: border-box;
  height: 100%;
  .header {
    grid-row: 1 / 2;
    grid-column: 1 / -1;
    height: 56px;
    z-index: 10;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    overflow: hidden;
  }
}

.sidebar-container {
  grid-row: 2 / 3;
  grid-column: 1 / 2;
  height: 100%;
  position: relative;
  z-index: 2;
  background-color: var(--card-color);
  color: var(--text-color-2);
  overflow: hidden;
  display: flex;
  flex-direction: row;
  .sidebar {
    width: 100%;
    height: 100%;
    overflow: auto;
    height: 100%;
    box-sizing: border-box;
    // 美化滚动条
    .scrollbar();
  }
}

.content {
  grid-row: 2 / 3;
  grid-column: 2 / 3;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.footer {
  grid-row: 3 / 4;
  grid-column: 1 / -1;
  height: 32px;
  z-index: 10;
  display: flex;
  align-items: center;
}

.detail-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
}

.drawer-sidebar {
  height: 100vh;
  height: 100dvh;
  padding-top: var(--top-inset);
  padding-bottom: var(--bottom-inset);
  overflow: hidden;
}
.drawer-mobile-detail {
  padding: 12px 4px !important;
}
</style>
