import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

export interface ColumnConfig {
  key: string
  width: number
  visible: boolean
}

export const allColumns = [
  { key: 'name', fixed: true, minWidth: 350 },
  { key: 'totalSize', minWidth: 90 },
  { key: 'sizeWhenDone', minWidth: 140 },
  { key: 'leftUntilDone', minWidth: 90 },
  { key: 'haveValid', minWidth: 90 },
  { key: 'downloadedEver', minWidth: 116 },
  { key: 'uploadedEver', minWidth: 100 },
  { key: 'uploadedDownloaded', minWidth: 130 },
  { key: 'percentDone', minWidth: 120 },
  { key: 'rateDownload', minWidth: 115 },
  { key: 'rateUpload', minWidth: 100 },
  { key: 'status', minWidth: 80 },
  { key: 'addedDate', minWidth: 190 },
  { key: 'peersSendingToUs', minWidth: 95 },
  { key: 'peersGettingFromUs', minWidth: 80 },
  { key: 'eta', minWidth: 85 },
  { key: 'uploadRatio', minWidth: 80 },
  // 格式化后的 tracker
  { key: 'cachedMainTracker', minWidth: 150 },
  // 格式化后的 tracker 状态
  { key: 'cachedTrackerStatus', minWidth: 125 },
  { key: 'doneDate', minWidth: 190 },
  { key: 'activityDate', minWidth: 190 },
  { key: 'downloadDir', minWidth: 180 },
  { key: 'bandwidthPriority', minWidth: 100 },
  { key: 'id', minWidth: 80 },
  { key: 'queuePosition', minWidth: 80 },
  { key: 'isPrivate', minWidth: 60 },
  { key: 'labels', minWidth: 100 },
  { key: 'secondsSeeding', minWidth: 120 },
  { key: 'group', minWidth: 95 },
  { key: 'file-count', minWidth: 90 },
  { key: 'pieceCount', minWidth: 90 },
  { key: 'metadataPercentComplete', minWidth: 150 }
]

export const defaultVisibleColumns = [
  'name',
  'totalSize',
  'haveValid',
  'downloadedEver',
  'uploadedEver',
  'percentDone',
  'rateDownload',
  'eta',
  'rateUpload',
  'status',
  'addedDate',
  'peersSendingToUs',
  'peersGettingFromUs',
  'uploadRatio',
  'bandwidthPriority',
  'labels',
  'secondsSeeding'
]

const COLUMN_CONFIG_VERSION = 1

export function useColumns(storageKey = 'torrent-columns') {
  const { t } = useI18n()

  // 初始化 visibleColumns
  const columns = useStorage<ColumnConfig[]>(
    storageKey,
    allColumns.map((col) => {
      const isDefaultVisible = defaultVisibleColumns.includes(col.key)
      return {
        key: col.key,
        width: col.minWidth,
        visible: col.key === 'name' ? true : isDefaultVisible
      }
    })
  )
  const columnConfigVersion = useStorage<number>('torrent-columns-version', 0)
  if (columnConfigVersion.value < COLUMN_CONFIG_VERSION) {
    columns.value = columns.value.map((col) => (col.key === 'eta' ? { ...col, visible: true } : col))
    columnConfigVersion.value = COLUMN_CONFIG_VERSION
  }

  // name 列默认显示
  function setVisibleColumns(cols: ColumnConfig[]) {
    columns.value = cols.map((col) => (col.key === 'name' ? { ...col, visible: true } : col))
  }

  function updateColumnWidth(key: string, width: number) {
    columns.value = columns.value.map((col) => (col.key === key ? { ...col, width } : col))
  }

  function toggleColumnVisible(key: string) {
    if (key === 'name') {
      return
    }
    columns.value = columns.value.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
  }

  function moveColumn(from: number, to: number) {
    const arr = [...columns.value]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    columns.value = arr
  }

  // 获取列的国际化标题
  function getColumnTitle(key: string): string {
    return t(`columns.${key}`)
  }

  const visibleColumns = computed(() => columns.value.filter((col) => col.visible))
  const tableMinWidth = computed(() => visibleColumns.value.reduce((sum, col) => sum + (col.width || 150), 0))
  const mapColumnWidth = computed(() => {
    return visibleColumns.value.reduce(
      (acc, col) => {
        acc[col.key] = col.width
        return acc
      },
      {} as Record<string, number>
    )
  })
  return {
    columns,
    setVisibleColumns,
    updateColumnWidth,
    toggleColumnVisible,
    moveColumn,
    getColumnTitle,
    visibleColumns,
    tableMinWidth,
    mapColumnWidth
  }
}
