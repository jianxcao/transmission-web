<script setup lang="ts">
import type { Torrent } from '@/api/rpc'
import { formatEta, timeToStr } from '@/utils'
interface Column {
  key: string
  title: string
  cellComponent: string
  [key: string]: any
}
const props = defineProps<{ value: number | string; row: Torrent; col: Column }>()
const timeStr = computed(() => {
  if (props.col.key === 'eta') {
    return formatEta(Number(props.value), props.row.leftUntilDone, props.row.rateDownload)
  }
  const val = Number(props.value)
  if (isNaN(val)) {
    return ''
  }
  return timeToStr(val)
})
</script>
<template>
  <div class="text-right">{{ timeStr }}</div>
</template>
