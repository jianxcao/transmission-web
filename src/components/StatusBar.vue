<template>
  <footer :class="[$style.footer, props.class]">
    <div class="flex items-start gap-1 overflow-hidden flex-1 flex-wrap h-full py-[5px]">
      <n-tag v-for="(item, i) in infoTags" :key="i" :type="item.type" size="small">{{ item.text }}</n-tag>
    </div>
    <div :class="$style.actions">
      <button
        v-for="item in transferItems"
        :key="item.direction"
        type="button"
        :class="$style.transfer"
        :title="item.title"
        @click="openSpeedLimitDialog(item.direction)"
      >
        <n-icon :component="item.icon" :color="item.color" size="19" />
        <span>{{ item.rate }}</span>
        <span v-if="item.limit" :class="$style.limit">[{{ item.limit }}]</span>
        <span :class="$style.total">({{ item.total }})</span>
      </button>
      <n-button
        quaternary
        circle
        size="small"
        @click="onToggleTheme"
        :title="$t('statusBar.toggleTheme')"
        class="flex items-center justify-center"
      >
        <template #icon>
          <n-icon :component="isDark ? MoonIcon : SunIcon" />
        </template>
      </n-button>
      <n-button
        quaternary
        circle
        size="small"
        @click="onShowAbout"
        :title="$t('statusBar.about')"
        class="flex items-center justify-center"
      >
        <template #icon>
          <n-icon :component="InfoIcon" />
        </template>
      </n-button>
    </div>
  </footer>
  <AboutDialog v-model:show="showAbout" :version="session?.['version']" :server="serverHost" author="..." />
  <GlobalSpeedLimitDialog
    v-model:show="showSpeedLimitDialog"
    :direction="speedLimitDirection"
    @saved="statsStore.fetchStats()"
  />
</template>
<script setup lang="ts">
import DoubleArrowDown from '@/assets/icons/doubleArrowDown.svg?component'
import DoubleArrowUp from '@/assets/icons/doubleArrowUp.svg?component'
import GlobalSpeedLimitDialog from '@/components/dialog/GlobalSpeedLimitDialog.vue'
import { useSessionStore, useSettingStore, useStatsStore, useTorrentStore } from '@/store'
import { formatSize, formatSpeed } from '@/utils'
import { InformationCircle as InfoIcon, Moon as MoonIcon, Sunny as SunIcon } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  class?: string
}>()

const sessionStore = useSessionStore()
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const statsStore = useStatsStore()
const { t: $t } = useI18n()

const session = computed(() => sessionStore.session)
const torrents = computed(() => torrentStore.torrents)
const totalSize = computed(() => torrents.value.reduce((sum, t) => sum + (t.sizeWhenDone || 0), 0))

const computedFields = computed(() => {
  return torrents.value.reduce(
    (prev, t) => {
      prev.totalSize += t.sizeWhenDone || 0
      prev.downRate += t.rateDownload || 0
      prev.upRate += t.rateUpload || 0
      return prev
    },
    {
      totalSize: 0,
      downRate: 0,
      upRate: 0
    }
  )
})
const selectedKeys = computed(() => torrentStore.selectedKeys || [])
const selectedSize = computed(() => {
  if (!selectedKeys.value.length) {
    return 0
  }
  return torrents.value
    .filter((t) => selectedKeys.value.includes(t.id))
    .reduce((sum, t) => sum + (t.sizeWhenDone || 0), 0)
})

const limit = computed(() => {
  // 提前判断 session，不存在则返回默认值
  if (!session.value) {
    return {
      downRateLimit: null,
      upRateLimit: null,
      freeSpace: 0
    }
  }

  const altSpeedEnabled = Boolean(session.value['alt-speed-enabled'])
  const getEnabledLimit = (enabled: boolean, value: unknown) => {
    const numericValue = Number(value)
    return enabled && Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null
  }
  const downRateLimit = getEnabledLimit(
    altSpeedEnabled || Boolean(session.value['speed-limit-down-enabled']),
    altSpeedEnabled ? session.value['alt-speed-down'] : session.value['speed-limit-down']
  )
  const upRateLimit = getEnabledLimit(
    altSpeedEnabled || Boolean(session.value['speed-limit-up-enabled']),
    altSpeedEnabled ? session.value['alt-speed-up'] : session.value['speed-limit-up']
  )

  const freeSpace = session.value['download-dir-free-space'] || 0

  return {
    downRateLimit,
    upRateLimit,
    freeSpace
  }
})

const serverHost = computed(() => settingStore.serverHost)

// 主题切换（naive-ui）
const isDark = computed(() => settingStore.setting.theme === 'dark')
function onToggleTheme() {
  settingStore.setTheme(isDark.value ? 'light' : 'dark')
}

// 关于弹窗（naive-ui n-dialog）
const showAbout = ref(false)
function onShowAbout() {
  showAbout.value = true
}

const speedLimitDirection = ref<'download' | 'upload'>('download')
const showSpeedLimitDialog = ref(false)
function openSpeedLimitDialog(direction: 'download' | 'upload') {
  speedLimitDirection.value = direction
  showSpeedLimitDialog.value = true
}

const currentStats = computed(() => statsStore.stats?.['current-stats'])
const transferItems = computed(() => [
  {
    direction: 'download' as const,
    icon: DoubleArrowDown,
    color: '#16a34a',
    rate: formatSpeed(statsStore.stats?.downloadSpeed ?? computedFields.value.downRate),
    limit: limit.value.downRateLimit === null ? '' : formatSpeed(limit.value.downRateLimit * 1024),
    total: formatSize(currentStats.value?.downloadedBytes ?? 0),
    title: $t('statusBar.setDownloadLimit')
  },
  {
    direction: 'upload' as const,
    icon: DoubleArrowUp,
    color: '#3b82f6',
    rate: formatSpeed(statsStore.stats?.uploadSpeed ?? computedFields.value.upRate),
    limit: limit.value.upRateLimit === null ? '' : formatSpeed(limit.value.upRateLimit * 1024),
    total: formatSize(currentStats.value?.uploadedBytes ?? 0),
    title: $t('statusBar.setUploadLimit')
  }
])

const infoTags = computed(() => [
  { text: $t('statusBar.version', { version: session.value?.['version'] ?? '--' }), type: 'info' as const },
  { text: $t('statusBar.server', { server: serverHost.value }), type: 'info' as const },
  { text: $t('statusBar.totalSize', { size: formatSize(totalSize.value) }), type: 'info' as const },
  ...(selectedSize.value > 0
    ? [{ text: $t('statusBar.selectedSize', { size: formatSize(selectedSize.value) }), type: 'info' as const }]
    : []),
  { text: $t('statusBar.freeSpace', { size: formatSize(limit.value.freeSpace) }), type: 'info' as const }
])
</script>

<style module lang="less">
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  white-space: nowrap;
  width: 100%;
  height: 100%;
  padding: 0 8px;
  border-top: 1px solid var(--border-color);
  gap: 16px;
}

.actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 100%;
}

.transfer {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 10px;
  border: 0;
  border-left: 1px solid var(--border-color);
  color: var(--text-color-2, inherit);
  background: transparent;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: var(--primary-color);
    background: var(--hover-color, rgb(128 128 128 / 10%));
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
}

.limit {
  color: var(--warning-color, #d97706);
}

@media (max-width: 720px) {
  .total {
    display: none;
  }

  .transfer {
    padding: 0 6px;
  }
}
</style>
