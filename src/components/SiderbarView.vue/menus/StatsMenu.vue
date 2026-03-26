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
import { useSettingStore } from '@/store'
import { formatSize, timeToStr } from '@/utils'
import { useI18n } from 'vue-i18n'
import { BarChartOutline } from '@vicons/ionicons5'
import { renderIcon } from '@/utils'

const { t } = useI18n()
const statsStore = useStatsStore()
const settingStore = useSettingStore()

function statItem(label: string, value: string) {
  return {
    label: () => h('div', { class: 'flex justify-between w-full pr-2' }, [
      h('span', { class: 'opacity-60' }, label),
      h('span', value),
    ]),
    key: `stats-${label}`,
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
      ],
    },
  ]
})
</script>
