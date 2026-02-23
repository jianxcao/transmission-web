<template>
  <div class="peers-tab">
    <div v-if="isMobile" class="peer-cards">
      <div v-for="peer in peerData" :key="peer.key" class="peer-card">
        <div class="peer-card-header">
          <span class="peer-country">
            <span v-if="peer.countryCode" :class="`fi fi-${peer.countryCode.toLowerCase()}`"></span>
            <span v-else class="globe-icon">🌐</span>
            <span>{{ peer.countryName || peer.countryDisplay }}</span>
          </span>
          <span class="peer-address">{{ peer.address }}</span>
        </div>
        <div class="peer-card-row">{{ t('torrentDetail.peers.client') }}: {{ peer.clientName || '-' }}</div>
        <div class="peer-card-row">
          <span>{{ t('torrentDetail.peers.progress') }}: {{ ((peer.progress || 0) * 100).toFixed(1) }}%</span>
          <span>{{ getPeerStatus(peer) }}</span>
        </div>
        <div class="peer-card-row">
          <span>{{ t('torrentDetail.peers.uploadSpeed') }}: {{ formatSpeed(peer.rateToPeer || 0) }}</span>
          <span>{{ t('torrentDetail.peers.downloadSpeed') }}: {{ formatSpeed(peer.rateToClient || 0) }}</span>
        </div>
        <div class="peer-card-row">
          <span>{{ t('torrentDetail.peers.port') }}: {{ peer.port || '-' }}</span>
          <span>{{ t('torrentDetail.peers.encryption') }}: {{ getEncryptionStatus(peer.flagStr) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="table-container">
      <n-data-table
        :columns="columns"
        :data="peerData"
        :pagination="pagination"
        size="small"
        :bordered="false"
        :paginate-single-page="false"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Torrent, Peer } from '@/api/rpc'
import type { DataTableColumns } from 'naive-ui'
import { formatSpeed } from '@/utils'
import { h, computed, ref, watch, onMounted } from 'vue'
import { NProgress } from 'naive-ui'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { useI18n } from 'vue-i18n'
import { useTorrentStore, useSettingStore } from '@/store'
import { getCachedCountryCode, hasCachedCountryCode, preloadCountryCodes, getCountryName } from '@/utils/ipLookup'

const { t } = useI18n()
const isMobile = useIsSmallScreen()
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const props = defineProps<{ torrent: Torrent }>()

const progressThemeOverrides = computed(() => ({
  textColorLineInner: settingStore.setting.theme === 'dark' ? '#fff' : '#222',
  fillColor: settingStore.setting.theme === 'dark' ? '#4a9eff' : '#93c5fd'
}))

const sortKey = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')
const refreshCounter = ref(0)
const isPreloading = ref(false)
const lastPreloadPeersHash = ref('')

function triggerPeerPreload() {
  if (!props.torrent.peers || isPreloading.value) return
  const peersHash = JSON.stringify(props.torrent.peers.map((p) => ({ a: p.address, p: p.port })))
  if (peersHash === lastPreloadPeersHash.value) return
  lastPreloadPeersHash.value = peersHash
  isPreloading.value = true
  const addresses = props.torrent.peers.map((p) => p.address || '').filter((a) => a && !hasCachedCountryCode(a))
  preloadCountryCodes(addresses).finally(() => {
    isPreloading.value = false
    refreshCounter.value++
  })
}

onMounted(() => {
  if (torrentStore.detailTab === 'peers' && props.torrent.peers) triggerPeerPreload()
})

watch(
  () => torrentStore.detailTab,
  (newTab) => {
    if (newTab === 'peers') triggerPeerPreload()
  },
  { immediate: true }
)
watch(
  () => props.torrent.peers?.length,
  (newLength) => {
    if (newLength && newLength > 0 && torrentStore.detailTab === 'peers') triggerPeerPreload()
  }
)

const pagination = { pageSize: 100, showSizePicker: true, pageSizes: [10, 20, 50, 100] }

function SortIcon({ columnKey }: { columnKey: string }) {
  return sortKey.value === columnKey ? h('span', { class: 'sort-icon' }, sortOrder.value === 'asc' ? '↑' : '↓') : null
}

const columns: DataTableColumns<
  Peer & { key: string; countryDisplay: string; countryCode: string; countryName: string }
> = [
  {
    title: () =>
      h('div', { class: 'flex items-center gap-1 cursor-pointer', onClick: () => handleSort('countryCode') }, [
        h('span', t('torrentDetail.peers.country')),
        h(SortIcon, { columnKey: 'countryCode' })
      ]),
    key: 'countryDisplay',
    width: 180,
    render: (row) =>
      h('div', { style: 'display: inline-flex; align-items: center; gap: 6px;' }, [
        row.countryCode
          ? h('span', { class: `fi fi-${row.countryCode.toLowerCase()}` })
          : h('span', { class: 'globe-icon' }, '🌐'),
        h('span', row.countryName || row.countryDisplay)
      ])
  },
  { title: t('torrentDetail.peers.ip'), key: 'address', width: 320, ellipsis: { tooltip: true } },
  {
    title: () =>
      h('div', { class: 'flex items-center gap-1 cursor-pointer', onClick: () => handleSort('port') }, [
        h('span', t('torrentDetail.peers.port')),
        h(SortIcon, { columnKey: 'port' })
      ]),
    key: 'port',
    width: 80,
    render: (row) => row.port || '-'
  },
  {
    title: () =>
      h('div', { class: 'flex items-center gap-1 cursor-pointer', onClick: () => handleSort('clientName') }, [
        h('span', t('torrentDetail.peers.client')),
        h(SortIcon, { columnKey: 'clientName' })
      ]),
    key: 'clientName',
    width: 140,
    render: (row) => row.clientName || '-'
  },
  {
    title: () =>
      h('div', { class: 'flex items-center gap-1 cursor-pointer', onClick: () => handleSort('progress') }, [
        h('span', t('torrentDetail.peers.progress')),
        h(SortIcon, { columnKey: 'progress' })
      ]),
    key: 'progress',
    width: 100,
    render: (row) =>
      h(NProgress, {
        type: 'line',
        size: 'small',
        percentage: row.progress ? Number((row.progress * 100).toFixed(2)) : 0,
        indicatorPlacement: 'inside',
        processing: !(row.progress === 1),
        themeOverrides: progressThemeOverrides.value
      })
  },
  {
    title: () =>
      h('div', { class: 'flex items-center gap-1 cursor-pointer', onClick: () => handleSort('rateToPeer') }, [
        h('span', t('torrentDetail.peers.uploadSpeed')),
        h(SortIcon, { columnKey: 'rateToPeer' })
      ]),
    key: 'rateToPeer',
    width: 120,
    align: 'right',
    render: (row) => formatSpeed(row.rateToPeer || 0)
  },
  {
    title: () =>
      h('div', { class: 'flex items-center gap-1 cursor-pointer', onClick: () => handleSort('rateToClient') }, [
        h('span', t('torrentDetail.peers.downloadSpeed')),
        h(SortIcon, { columnKey: 'rateToClient' })
      ]),
    key: 'rateToClient',
    width: 120,
    align: 'right',
    render: (row) => formatSpeed(row.rateToClient || 0)
  },
  {
    title: t('torrentDetail.peers.encryption'),
    key: 'encryption',
    width: 60,
    render: (row) => getEncryptionStatus(row.flagStr)
  },
  { title: t('torrentDetail.peers.status'), key: 'status', width: 60, render: (row) => getPeerStatus(row) }
]

function handleSort(columnKey: string) {
  if (sortKey.value === columnKey) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = columnKey
    sortOrder.value = 'desc'
  }
}

const getEncryptionStatus = (flagStr?: string) =>
  flagStr?.includes('E') ? t('torrentDetail.peers.yes') : t('torrentDetail.peers.no')

const getPeerStatus = (peer: Peer) => {
  const statusFlagStrings = { O: 'O', D: 'D', d: 'd', U: 'U', u: 'u', K: 'K', '?': '?' } as const
  const flags = peer.flagStr as string
  return (
    [...flags.matchAll(/[ODdUuK?]/g)].map((s) => statusFlagStrings[s[0] as keyof typeof statusFlagStrings]).join('') ||
    '-'
  )
}

const peerData = computed(() => {
  refreshCounter.value
  let peers = (props.torrent.peers || []).map((peer: Peer) => {
    const address = peer.address || ''
    const countryCode = getCachedCountryCode(address) || ''
    const countryName = countryCode ? getCountryName(countryCode) : ''
    return {
      ...peer,
      key: `${address}:${peer.port || 0}`,
      countryDisplay: countryCode || countryName,
      countryCode,
      countryName
    }
  })

  if (sortKey.value) {
    peers = [...peers].sort((a, b) => {
      let aVal = (a as Record<string, unknown>)[sortKey.value!]
      let bVal = (b as Record<string, unknown>)[sortKey.value!]
      if (sortKey.value === 'clientName' || sortKey.value === 'countryCode') {
        aVal = aVal || ''
        bVal = bVal || ''
      } else if (sortKey.value === 'progress' || sortKey.value === 'rateToPeer' || sortKey.value === 'rateToClient') {
        aVal = aVal || 0
        bVal = bVal || 0
      } else if (sortKey.value === 'port') {
        aVal = Number(a.port) || 0
        bVal = Number(b.port) || 0
      }
      return typeof aVal === 'string'
        ? sortOrder.value === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal)
        : sortOrder.value === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number)
    })
  }
  return peers
})
</script>
<style scoped lang="less">
.peers-tab {
  .peer-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .peer-card {
    background: var(--card-color);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--border-color);
  }
  .peer-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .peer-country {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .peer-address {
    font-size: 13px;
    word-break: break-all;
    color: var(--primary-color);
  }
  .peer-card-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--text-color-secondary);
  }
  .table-container {
    width: 100%;
  }
  :deep(.n-data-table) {
    .n-scrollbar {
      overflow: visible;
      .n-scrollbar-container {
        width: auto;
        height: auto;
        overflow: visible;
      }
    }
    .n-data-table-thead {
      position: sticky;
      top: calc(var(--spacing) * -3);
      background-color: var(--card-color);
      z-index: 1;
    }
  }
}

.sort-icon {
  font-size: 12px;
  line-height: 1;
}
.globe-icon {
  font-size: 18px;
  margin-right: 4px;
}
.peer-country .fi,
:deep(.n-data-table-td[data-col-key='countryDisplay'] .fi) {
  width: 20px;
  height: 15px;
  vertical-align: middle;
  margin-right: 4px;
  display: inline-block;
  background-size: cover;
  background-position: 50%;
  background-repeat: no-repeat;
}
:deep(.n-data-table-td[data-col-key='countryDisplay']) {
  white-space: nowrap;
}
</style>
