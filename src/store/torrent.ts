import type { Torrent } from '@/api/rpc'
import { rpc } from '@/api/rpc'
import { useColumns } from '@/composables/useColumns'
import { useSelection } from '@/composables/useSelection'
import { useSettingStore } from '@/store/setting'
import { useSessionStore } from './session'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  buildDirMenuList,
  buildDirMenuTree,
  detailFilterOptions,
  getTorrentTrackerSites,
  getTrackerSiteKey,
  matchesTrackerHost,
  pruneTrackerSitesCache,
  isFilterTorrents,
  mapToOptions,
  processTorrent,
  sortTorrents,
  type IMenuItem
} from './torrentUtils'

const listFields = [
  'activityDate',
  'addedDate',
  'bandwidthPriority',
  'doneDate',
  'downloadDir',
  'downloadedEver',
  'error',
  'errorString',
  'eta',
  'file-count',
  'group',
  'haveValid',
  'id',
  'isPrivate',
  'labels',
  'leftUntilDone',
  'magnetLink',
  'metadataPercentComplete',
  'name',
  'peersGettingFromUs',
  'peersSendingToUs',
  'percentDone',
  'recheckProgress',
  'pieceCount',
  'pieceSize',
  'queuePosition',
  'rateDownload',
  'rateUpload',
  'secondsSeeding',
  'sizeWhenDone',
  'status',
  'totalSize',
  'trackerStats',
  'uploadRatio',
  'uploadedEver',
  'trackerList',
  'seedIdleLimit',
  'seedIdleMode',
  'seedRatioLimit',
  'seedRatioMode',
  'sequential_download',
  'honorsSessionLimits',
  'downloadLimited',
  'uploadLimited',
  'downloadLimit',
  'uploadLimit',
  'peer-limit'
]

// 轮询只读取高频变化字段，静态元数据和 tracker 列表按较低频率刷新。
// Transmission 的 torrent-get 不提供分页参数，因此减少重复字段传输比前端分页更可靠。
const pollingFields = [
  'id',
  'name',
  'labels',
  'downloadDir',
  'bandwidthPriority',
  'activityDate',
  'downloadedEver',
  'error',
  'errorString',
  'eta',
  'haveValid',
  'leftUntilDone',
  'peersGettingFromUs',
  'peersSendingToUs',
  'percentDone',
  'queuePosition',
  'rateDownload',
  'rateUpload',
  'secondsSeeding',
  'sizeWhenDone',
  'status',
  'totalSize',
  'uploadRatio',
  'uploadedEver',
  'honorsSessionLimits',
  'downloadLimited',
  'downloadLimit',
  'uploadLimited',
  'uploadLimit',
  'peer-limit',
  'seedIdleLimit',
  'seedIdleMode',
  'seedRatioLimit',
  'seedRatioMode',
  'sequential_download'
]

const metadataRefreshInterval = 60_000

const detailFields = [
  'hashString',
  'recheckProgress',
  'files',
  'fileStats',
  'peers',
  'peersFrom',
  'creator',
  'comment',
  'dateCreated',
  'maxConnectedPeers'
]

export const useTorrentStore = defineStore('torrent', () => {
  const torrents = ref<Torrent[]>([])
  const settingStore = useSettingStore()
  const sessionStore = useSessionStore()
  const applyingTrackerRules = ref(false)
  const trackerRuleSignatures = new Map<number, string>()
  const fetching = ref(false)
  let trackerRuleApplyPending = false
  let lastMetadataFetchAt = 0
  // 排序相关
  const sortKey = ref<string>('id') // 默认按添加时间排序
  const sortOrder = ref<'asc' | 'desc'>('desc') // 默认降序
  function setSort(key: string) {
    if (sortKey.value === key) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey.value = key
      sortOrder.value = 'desc' // 新字段默认降序
    }
  }

  // 搜索关键字
  const search = ref('')

  // 过滤条件（单选）
  const statusFilter = ref<string>('all')
  const labelsFilter = ref<string>('all')
  const trackerFilter = ref<string>('all')
  const errorStringFilter = ref<string>('all')
  const downloadDirFilter = ref<string>('all')

  // 列显示相关逻辑抽离
  const {
    columns,
    setVisibleColumns,
    updateColumnWidth,
    toggleColumnVisible,
    moveColumn,
    visibleColumns,
    tableMinWidth,
    mapColumnWidth,
    getColumnTitle
  } = useColumns()

  // 真正的一次循环计算所有数据
  const computedData = computed(() => {
    // 初始化统计集合
    const labelsSet = new Map<string, IMenuItem>()
    labelsSet.set('noLabels', { count: 0, label: '无标签' })
    const trackerSet = new Map<string, IMenuItem>()
    const errorStringSet = new Map<string, IMenuItem>()
    const downloadDirSet = new Map<string, IMenuItem>()
    const statusSet = new Map<string, IMenuItem>()

    // 存储过滤后的结果
    const filtered: Torrent[] = []
    //  生成索引映射
    const mapFilterTorrentsIndex: Record<number, number> = {}
    const mapTorrentsIndex: Record<number, number> = {}

    // 目录菜单当前模式（read once，使其参与依赖收集）
    const dirMenuMode = settingStore.setting.dirMenuMode
    const ignoredTrackerPrefixes = settingStore.setting.ignoredTrackerPrefixes

    // 一次循环完成所有计算：统计 + 过滤
    torrents.value.forEach((t, idx) => {
      mapTorrentsIndex[t.id] = idx
      // 将选项全部放到 map 中
      detailFilterOptions(t, labelsSet, trackerSet, errorStringSet, downloadDirSet, statusSet, ignoredTrackerPrefixes)
      // 如果通过所有过滤条件，加入结果数组
      if (
        isFilterTorrents(
          t,
          search,
          statusFilter,
          labelsFilter,
          trackerFilter,
          errorStringFilter,
          downloadDirFilter,
          dirMenuMode,
          ignoredTrackerPrefixes
        )
      ) {
        filtered.push(t)
      }
    })

    // === 3. 排序（只对过滤后的数据进行排序） ===
    if (sortKey.value) {
      sortTorrents(filtered, sortKey, sortOrder)
    }
    filtered.forEach((t, idx) => {
      mapFilterTorrentsIndex[t.id] = idx
    })
    // 检测所有的 filter 的值是否在 map 里面，如果不在重置成全部
    if (!statusSet.get(statusFilter.value)) {
      statusFilter.value = 'all'
    }
    if (!labelsSet.get(labelsFilter.value)) {
      labelsFilter.value = 'all'
    }
    if (!trackerSet.get(trackerFilter.value)) {
      trackerFilter.value = 'all'
    }
    if (!errorStringSet.get(errorStringFilter.value)) {
      errorStringFilter.value = 'all'
    }
    // 根据用户配置生成目录菜单：扁平 (list) 或 树形 (tree)
    // validKeys 用于校验当前过滤值是否仍然有效（数据/模式变化后失效则重置）
    const dirMenu = dirMenuMode === 'tree' ? buildDirMenuTree(downloadDirSet) : buildDirMenuList(downloadDirSet)
    if (!dirMenu.validKeys.has(downloadDirFilter.value)) {
      downloadDirFilter.value = 'all'
    }
    const options = {
      labelsOptions: mapToOptions(labelsSet, torrents.value.length),
      trackerOptions: mapToOptions(trackerSet, torrents.value.length),
      errorStringOptions: mapToOptions(errorStringSet, torrents.value.length),
      downloadDirOptions: mapToOptions(downloadDirSet, torrents.value.length),
      downloadDirMenuOptions: dirMenu.options,
      statusOptions: mapToOptions(statusSet, torrents.value.length)
    }
    return {
      options,
      filterTorrents: filtered,
      mapFilterTorrentsIndex,
      mapTorrentsIndex: mapTorrentsIndex
    }
  })

  // 从合并的 computed 中提取各个部分
  const options = computed(() => computedData.value.options)
  const filterTorrents = computed(() => computedData.value.filterTorrents)
  const mapFilterTorrentsIndex = computed(() => computedData.value.mapFilterTorrentsIndex)
  const scrollToTorrentId = ref<number | null>(null)
  const scrollToTorrentRequest = ref(0)

  // selection 相关逻辑拆分
  const {
    mapSelectedKeys,
    selectedKeys,
    setSelectedKeys,
    toggleSelectedKey,
    clearSelectedKeys,
    selectRange,
    lastSelectedKey,
    setLastSelectedKey
  } = useSelection(() => filterTorrents.value)

  function requestScrollToTorrent(id: number | null) {
    if (id === null || mapFilterTorrentsIndex.value[id] === undefined) {
      return
    }
    scrollToTorrentId.value = id
    scrollToTorrentRequest.value += 1
  }

  function keepVisibleSelectionAndRequestScroll() {
    if (selectedKeys.value.length === 0) {
      return
    }
    const visibleSelectedKeys = selectedKeys.value.filter((id) => mapFilterTorrentsIndex.value[id] !== undefined)
    if (visibleSelectedKeys.length === 0) {
      clearSelectedKeys()
      return
    }
    const targetId =
      lastSelectedKey.value !== null && visibleSelectedKeys.includes(lastSelectedKey.value)
        ? lastSelectedKey.value
        : visibleSelectedKeys[visibleSelectedKeys.length - 1]
    setSelectedKeys(visibleSelectedKeys)
    setLastSelectedKey(targetId)
    requestScrollToTorrent(targetId)
  }

  function getTrackerHosts(torrent: Torrent) {
    return getTorrentTrackerSites(torrent, settingStore.setting.ignoredTrackerPrefixes)
  }

  async function applyTrackerLimitRules(items: Torrent[]) {
    if (applyingTrackerRules.value) {
      trackerRuleApplyPending = true
      return
    }
    const rules = (settingStore.setting.trackerLimitRules || []).filter(
      (rule) =>
        rule &&
        rule.enabled &&
        typeof rule.pattern === 'string' &&
        rule.pattern.trim() &&
        (rule.uploadLimit != null || rule.downloadLimit != null)
    )
    const itemById = new Map(items.map((item) => [item.id, item]))
    const grouped = new Map<string, { ids: number[]; args: Record<string, unknown> }>()
    for (const torrent of items) {
      const hosts = getTrackerHosts(torrent)
      const rule = rules.find((candidate) => {
        const pattern = getTrackerSiteKey(candidate.pattern, settingStore.setting.ignoredTrackerPrefixes)
        return matchesTrackerHost(hosts, pattern)
      })
      const args: Record<string, unknown> = {}
      if (rule?.uploadLimit != null) {
        args.uploadLimited = true
        args.uploadLimit = Math.max(1, Math.round(rule.uploadLimit))
      }
      if (rule?.downloadLimit != null) {
        args.downloadLimited = true
        args.downloadLimit = Math.max(1, Math.round(rule.downloadLimit))
      }
      if (Object.keys(args).length === 0) {
        if (!rule) {
          trackerRuleSignatures.delete(torrent.id)
        }
        continue
      }
      const signature = `${rule?.id || 'none'}:${JSON.stringify(args)}`
      const ruleAlreadyApplied =
        !!rule &&
        (rule.uploadLimit == null || (torrent.uploadLimited === true && torrent.uploadLimit === args.uploadLimit)) &&
        (rule.downloadLimit == null ||
          (torrent.downloadLimited === true && torrent.downloadLimit === args.downloadLimit))
      if (trackerRuleSignatures.get(torrent.id) === signature && ruleAlreadyApplied) {
        continue
      }
      if (!rule) {
        continue
      }
      const key = JSON.stringify(args)
      const group = grouped.get(key) || { ids: [], args }
      group.ids.push(torrent.id)
      grouped.set(key, group)
    }
    if (grouped.size === 0) {
      return
    }

    applyingTrackerRules.value = true
    try {
      for (const group of grouped.values()) {
        await rpc.torrentSet({ ids: group.ids, ...group.args })
        const argsSignature = JSON.stringify(group.args)
        for (const id of group.ids) {
          const item = itemById.get(id)
          if (item) {
            Object.assign(item, group.args)
          }
          const torrent = item
          const hosts = torrent ? getTrackerHosts(torrent) : new Set<string>()
          const rule = torrent
            ? rules.find((candidate) => {
                const pattern = getTrackerSiteKey(candidate.pattern, settingStore.setting.ignoredTrackerPrefixes)
                return matchesTrackerHost(hosts, pattern)
              })
            : undefined
          if (rule) {
            trackerRuleSignatures.set(id, `${rule.id}:${argsSignature}`)
          } else {
            trackerRuleSignatures.delete(id)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to apply tracker limit rules', error)
    } finally {
      applyingTrackerRules.value = false
      if (trackerRuleApplyPending) {
        trackerRuleApplyPending = false
        void applyTrackerLimitRules(torrents.value)
      }
    }
  }

  async function fetchTorrents(forceMetadata = false) {
    if (fetching.value) {
      return
    }
    fetching.value = true
    try {
      const refreshMetadata =
        forceMetadata || torrents.value.length === 0 || Date.now() - lastMetadataFetchAt >= metadataRefreshInterval
      const listFormat = sessionStore.rpcVersion >= 18 || sessionStore.session?.version?.startsWith('4.') ? 'table' : 'objects'
      let res = await rpc.torrentGet(refreshMetadata ? listFields : pollingFields, undefined, undefined, listFormat)
      let fullFetch = refreshMetadata
      const oldIds = new Set(torrents.value.map((torrent) => torrent.id))
      // 新增种子可能在轻量轮询期间出现，补一次完整数据，避免列表出现空名称。
      if (
        !fullFetch &&
        res?.arguments?.torrents?.some((torrent) => !oldIds.has(torrent.id) || !torrent.name)
      ) {
        res = await rpc.torrentGet(listFields, undefined, undefined, listFormat)
        fullFetch = true
      }
      const old = torrents.value
      let newRes = res?.arguments?.torrents || []
      newRes = newRes.map((t) => {
        const processed = processTorrent(t, fullFetch)
        let item: Torrent
        const index = computedData.value.mapTorrentsIndex[processed.id]
        if (!fullFetch && index >= 0) {
          const updates = Object.fromEntries(
            pollingFields
              .filter((field) => field in processed)
              .map((field) => [field, processed[field as keyof Torrent]])
          )
          item = Object.assign({}, old[index], updates)
        } else if (index >= 0) {
          item = Object.assign({}, old[index], processed)
        } else {
          item = processed
        }
        return item
      })
      torrents.value = newRes
      const activeIds = new Set(newRes.map((t) => t.id))
      for (const id of trackerRuleSignatures.keys()) {
        if (!activeIds.has(id)) {
          trackerRuleSignatures.delete(id)
        }
      }
      pruneTrackerSitesCache(activeIds)
      if (fullFetch) {
        lastMetadataFetchAt = Date.now()
      }
      void applyTrackerLimitRules(newRes)
    } finally {
      fetching.value = false
    }
  }

  async function fetchDetails() {
    if (selectedKeys.value.length === 0) {
      return
    }
    const id = lastSelectedKey.value
    if (id === null) {
      return
    }
    const res = await rpc.torrentGet([...detailFields, ...listFields], [id], {
      params: {
        type: 'detail'
      }
    })
    const index = computedData.value.mapTorrentsIndex[id]
    if (index >= 0 && res?.arguments?.torrents?.[0]) {
      Object.assign(torrents.value[index], res?.arguments?.torrents?.[0])
    }
  }

  const interval = computed(() => settingStore.setting.polling.torrentInterval * 1000)
  const { pause: stopPolling, resume: startPolling } = useIntervalFn(fetchTorrents, interval, { immediate: false })
  const detailInterval = computed(() => settingStore.setting.polling.torrentDetailInterval * 1000)
  const { pause: stopDetailPolling, resume: startDetailPolling } = useIntervalFn(fetchDetails, detailInterval, {
    immediate: false
  })

  watch([search, statusFilter, labelsFilter, trackerFilter, errorStringFilter, downloadDirFilter, sortKey, sortOrder], () => {
    keepVisibleSelectionAndRequestScroll()
  })
  watch(
    () => settingStore.setting.trackerLimitRules,
    () => {
      if (torrents.value.length > 0) {
        void applyTrackerLimitRules(torrents.value)
      }
    },
    { deep: true }
  )
  ;(window as any).torrents = torrents
  return {
    getColumnTitle,
    torrents,
    filterTorrents,
    mapFilterTorrentsIndex,
    statusFilter,
    labelsFilter,
    trackerFilter,
    errorStringFilter,
    downloadDirFilter,
    search,
    labelsOptions: computed(() => options.value.labelsOptions),
    trackerOptions: computed(() => options.value.trackerOptions),
    errorStringOptions: computed(() => options.value.errorStringOptions),
    downloadDirOptions: computed(() => options.value.downloadDirOptions),
    downloadDirMenuOptions: computed(() => options.value.downloadDirMenuOptions),
    statusOptions: computed(() => options.value.statusOptions),
    fetchTorrents,
    mapSelectedKeys,
    selectedKeys,
    setSelectedKeys,
    toggleSelectedKey,
    clearSelectedKeys,
    selectRange,
    lastSelectedKey,
    setLastSelectedKey,
    startPolling,
    stopPolling,
    columns,
    setVisibleColumns,
    updateColumnWidth,
    toggleColumnVisible,
    moveColumn,
    visibleColumns,
    tableMinWidth,
    sortKey,
    sortOrder,
    setSort,
    mapColumnWidth,
    scrollToTorrentId,
    scrollToTorrentRequest,
    requestScrollToTorrent,
    fetchDetails,
    applyTrackerLimitRules,
    startDetailPolling,
    stopDetailPolling
  }
})
