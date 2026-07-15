<script setup lang="ts">
import type { Torrent } from '@/api/rpc'
import { getTorrentProgress } from '@/utils/torrentProgress'
interface Column {
  key: string
  title: string
  cellComponent: string
  [key: string]: any
}
const props = defineProps<{ value: number; row: Torrent; col: Column }>()

const percentage = computed(() => {
  return Math.round(getTorrentProgress(props.row) * 100)
})
const active = computed(() => {
  return props.row.rateDownload > 0 || props.row.rateUpload > 0
})
</script>
<template>
  <div>
    <n-progress
      type="line"
      :height="22"
      :border-radius="4"
      :percentage="percentage"
      indicator-placement="inside"
      :processing="active"
    />
  </div>
</template>
