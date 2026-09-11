<template>
  <n-menu
    :indent="8"
    :options="menuOptions"
    :value="null"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
  />
</template>

<script setup lang="ts">
import { useStatsStore } from '@/store/stats'
import { useSettingStore, useTorrentStore } from '@/store'
import { formatSize, timeToStr } from '@/utils'
import { useI18n } from 'vue-i18n'
import { BarChartOutline } from '@vicons/ionicons5'
import { renderIcon } from '@/utils'
import { getTrackerSiteKey } from '@/store/torrentUtils'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { NEllipsis } from 'naive-ui'

const { t } = useI18n()
const statsStore = useStatsStore()
const settingStore = useSettingStore()
const torrentStore = useTorrentStore()
const isMobile = useIsSmallScreen()

function statItem(label: string, value: string) {
  return {
    label: () => h('div', { class: 'flex justify-between w-full pr-2' }, [
      h('span', { class: 'opacity-60' }, label),
      h('span', value),
    ]),
    key: `stats-${label}`,
  }
}

const trackerSiteStats = computed(() => {
  const stats = new Map<string, { uploaded: number; torrents: number }>()
  const ignoredPrefixes = settingStore.setting.ignoredTrackerPrefixes
  torrentStore.torrents.forEach((torrent) => {
    const firstTracker = torrent.trackerStats?.[0]?.host || (torrent.trackerList || '').split(/\s+/).find(Boolean) || ''
    const site = getTrackerSiteKey(firstTracker, ignoredPrefixes)
    if (!site) {
      return
    }
    const current = stats.get(site) || { uploaded: 0, torrents: 0 }
    current.uploaded += torrent.uploadedEver || 0
    current.torrents += 1
    stats.set(site, current)
  })
  return Array.from(stats.entries()).sort((a, b) => b[1].uploaded - a[1].uploaded || a[0].localeCompare(b[0]))
})

function trackerSiteItem(site: string, stat: { uploaded: number; torrents: number }) {
  return {
    label: () =>
      h(
        'div',
        { class: 'flex justify-between w-full pr-2 gap-2' },
        [
          h(
            NEllipsis,
            {
              class: 'stats-site-label',
              tooltip: {
                trigger: isMobile.value ? 'click' : 'hover',
                placement: isMobile.value ? 'bottom-start' : 'right',
                maxWidth: isMobile.value ? undefined : 520,
                contentStyle: {
                  maxWidth: 'calc(100vw - 32px)',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere'
                }
              }
            },
            {
              default: () => site,
              tooltip: () => site
            }
          ),
          h('span', { class: 'opacity-60' }, formatSize(stat.uploaded))
        ]
      ),
    key: `stats-site-${site}`
  }
}

const menuOptions = computed(() => {
  const cum = statsStore.stats?.['cumulative-stats']
  const cur = statsStore.stats?.['current-stats']

  return [
    {
      label: t('statsDialog.title'),
      key: 'stats',
      icon: renderIcon(BarChartOutline),
      children: [
        // 累计
        {
          label: t('statsDialog.cumulative'),
          key: 'stats-cumulative',
          children: [
            statItem(t('statsDialog.uploaded'), cum ? formatSize(cum.uploadedBytes) : '-'),
            statItem(t('statsDialog.downloaded'), cum ? formatSize(cum.downloadedBytes) : '-'),
            statItem(t('statsDialog.filesAdded'), cum ? String(cum.filesAdded) : '-'),
            statItem(t('statsDialog.sessionCount'), cum ? String(cum.sessionCount) : '-'),
            statItem(t('statsDialog.activeTime'), cum ? (timeToStr(cum.secondsActive, false) || '0s') : '-'),
          ],
        },
        // 当前会话
        {
          label: t('statsDialog.currentSession'),
          key: 'stats-current',
          children: [
            statItem(t('statsDialog.uploaded'), cur ? formatSize(cur.uploadedBytes) : '-'),
            statItem(t('statsDialog.downloaded'), cur ? formatSize(cur.downloadedBytes) : '-'),
            statItem(t('statsDialog.filesAdded'), cur ? String(cur.filesAdded) : '-'),
            statItem(t('statsDialog.sessionCount'), cur ? String(cur.sessionCount) : '-'),
            statItem(t('statsDialog.activeTime'), cur ? (timeToStr(cur.secondsActive, false) || '0s') : '-'),
          ],
        },
        {
          label: () =>
            h(
              'span',
              { title: t('statsDialog.trackerUploadHint') },
              `${t('statsDialog.trackerUpload')}（${trackerSiteStats.value.length}）`
            ),
          key: 'stats-tracker-sites',
          children: trackerSiteStats.value.map(([site, stat]) => trackerSiteItem(site, stat))
        }
      ],
    },
  ]
})
</script>

<style scoped lang="less">
:deep(.stats-site-label) {
  display: block;
  width: 100%;
  min-width: 0;
}
</style>
