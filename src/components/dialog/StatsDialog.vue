<template>
  <n-modal v-model:show="show" preset="card" :title="t('statsDialog.title')" style="width: 480px" :bordered="false">
    <n-spin :show="loading">
      <div class="flex flex-col gap-4">
        <!-- 累计统计 -->
        <div>
          <div class="text-sm font-medium mb-2 opacity-60">{{ t('statsDialog.cumulative') }}</div>
          <n-grid :cols="2" :x-gap="12" :y-gap="8">
            <n-grid-item v-for="item in cumulativeItems" :key="item.label">
              <div class="flex flex-col">
                <span class="text-xs opacity-50">{{ item.label }}</span>
                <span class="text-sm font-medium">{{ item.value }}</span>
              </div>
            </n-grid-item>
          </n-grid>
        </div>

        <n-divider style="margin: 0" />

        <!-- 当前会话 -->
        <div>
          <div class="text-sm font-medium mb-2 opacity-60">{{ t('statsDialog.currentSession') }}</div>
          <n-grid :cols="2" :x-gap="12" :y-gap="8">
            <n-grid-item v-for="item in currentItems" :key="item.label">
              <div class="flex flex-col">
                <span class="text-xs opacity-50">{{ item.label }}</span>
                <span class="text-sm font-medium">{{ item.value }}</span>
              </div>
            </n-grid-item>
          </n-grid>
        </div>
      </div>
    </n-spin>
  </n-modal>
</template>

<script setup lang="ts">
import { useStatsStore } from '@/store/stats'
import { formatSize } from '@/utils'
import { timeToStr } from '@/utils'
import { useI18n } from 'vue-i18n'

const show = defineModel<boolean>('show', { default: false })
const { t } = useI18n()
const statsStore = useStatsStore()
const loading = ref(false)

watch(show, async (val) => {
  if (val) {
    loading.value = true
    try {
      await statsStore.fetchStats()
    } finally {
      loading.value = false
    }
  }
})

const cumulativeItems = computed(() => {
  const s = statsStore.stats?.['cumulative-stats']
  return [
    { label: t('statsDialog.uploaded'), value: s ? formatSize(s.uploadedBytes) : '-' },
    { label: t('statsDialog.downloaded'), value: s ? formatSize(s.downloadedBytes) : '-' },
    { label: t('statsDialog.filesAdded'), value: s ? String(s.filesAdded) : '-' },
    { label: t('statsDialog.sessionCount'), value: s ? String(s.sessionCount) : '-' },
    { label: t('statsDialog.activeTime'), value: s ? (timeToStr(s.secondsActive, false) || '0s') : '-' },
  ]
})

const currentItems = computed(() => {
  const s = statsStore.stats?.['current-stats']
  return [
    { label: t('statsDialog.uploaded'), value: s ? formatSize(s.uploadedBytes) : '-' },
    { label: t('statsDialog.downloaded'), value: s ? formatSize(s.downloadedBytes) : '-' },
    { label: t('statsDialog.filesAdded'), value: s ? String(s.filesAdded) : '-' },
    { label: t('statsDialog.sessionCount'), value: s ? String(s.sessionCount) : '-' },
    { label: t('statsDialog.activeTime'), value: s ? (timeToStr(s.secondsActive, false) || '0s') : '-' },
  ]
})
</script>
