import type { Torrent, TrackerStat } from '@/api/rpc'
import { statusFilterFunMap, statusFilters } from '@/const/status'
import { Status } from '@/types/tr'
import { ShuffleOutline } from '@vicons/ionicons5'
import i18n from '@/i18n'
import { isFunction } from 'lodash-es'
import { useSettingStore } from './setting'

export interface IMenuItem {
  icon?: Component
  count: number
  color?: string
  label?: string
}

// 将所有的选项放到 map
export const detailFilterOptions = function (
  t: Torrent,
  labelsSet: Map<string, IMenuItem>,
  trackerSet: Map<string, IMenuItem>,
  errorStringSet: Map<string, IMenuItem>,
  downloadDirSet: Map<string, IMenuItem>,
  statusSet: Map<string, IMenuItem>
) {
  const $t = i18n.global.t
  const settingStore = useSettingStore()
  // === 1. 统计各种选项（用于生成过滤选项） ===
  // labels 统计
  if (Array.isArray(t.labels) && t.labels.length > 0) {
    t.labels.forEach((l: string) => {
      const prev = labelsSet.get(l)
      labelsSet.set(l, { count: (prev?.count || 0) + 1 })
    })
  } else {
    const prev = labelsSet.get('noLabels')
    labelsSet.set('noLabels', { count: (prev?.count || 0) + 1, label: $t('common.noLabels') })
  }

  // tracker 统计
  if (t.trackerStats.length > 0) {
    t.trackerStats.forEach((tracker: TrackerStat) => {
      let host = tracker.host || ''
      const portMatch = portRe.exec(host)
      if (portMatch != null) {
        host = host.substring(0, portMatch.index)
      }
      const prefixMatch = settingStore.ignoredTrackerPrefixesReg.exec(host)
      // console.debug("prefixMatch", prefixMatch, settingStore.ignoredTrackerPrefixesReg)
      if (prefixMatch?.groups !== undefined) {
        host = host.substring(prefixMatch.groups.prefix.length + 1)
      }
      const prev = trackerSet.get(host)
      trackerSet.set(host, { count: (prev?.count || 0) + 1 })
    })
  } else {
    const prev = trackerSet.get('noTracker')
    trackerSet.set('noTracker', { count: (prev?.count || 0) + 1, label: $t('common.noTracker') })
  }

  // error 统计
  if (t.cachedError) {
    const prev = errorStringSet.get(t.cachedError)
    errorStringSet.set(t.cachedError, { count: (prev?.count || 0) + 1, color: 'var(--error-color)' })
  }

  // downloadDir 统计
  if (t.downloadDir) {
    const prev = downloadDirSet.get(t.downloadDir)
    downloadDirSet.set(t.downloadDir, { count: (prev?.count || 0) + 1 })
  }

  // status 统计
  statusFilters.forEach((filter) => {
    const prev = statusSet.get(filter.key)
    let count = prev?.count || 0
    if (filter.filter(t)) {
      count++
    }
    statusSet.set(filter.key, {
      icon: filter.icon,
      color: filter.color,
      label: filter.label($t),
      count: count
    })
  })
}

// 将 map 转换成数组
export const mapToOptions = (map: Map<string, IMenuItem>, total: number) => {
  const $t = i18n.global.t
  return [
    { key: 'all', label: `${$t('common.all', { total })}`, icon: ShuffleOutline },
    ...Array.from(map.entries()).map(([item, value]) => {
      const label = isFunction(value.label) ? value.label($t) : value.label
      return {
        key: item,
        label: `${label || item}（${value.count}）`,
        color: value?.color,
        icon: value?.icon
      } as {
        key: string
        label: string
        color?: string
        icon?: Component
      }
    })
  ]
}

// 是否可以过滤这个种子
export const isFilterTorrents = function (
  t: Torrent,
  search: globalThis.Ref<string, string>,
  statusFilter: globalThis.Ref<string, string>,
  labelsFilter: globalThis.Ref<string, string>,
  trackerFilter: globalThis.Ref<string, string>,
  errorStringFilter: globalThis.Ref<string, string>,
  downloadDirFilter: globalThis.Ref<string, string>
) {
  // === 2. 同时进行过滤判断 ===
  let shouldInclude = true

  // 搜索过滤
  if (search.value && !t.name.includes(search.value)) {
    shouldInclude = false
  }

  // 状态过滤
  if (
    shouldInclude &&
    statusFilter.value &&
    statusFilter.value !== 'all' &&
    !statusFilterFunMap.get(statusFilter.value)?.(t)
  ) {
    shouldInclude = false
  }

  // 标签过滤
  if (
    shouldInclude &&
    labelsFilter.value &&
    labelsFilter.value !== 'all' &&
    !(labelsFilter.value == 'noLabels' && (!t.labels || t.labels.length === 0)) &&
    !t.labels.includes(labelsFilter.value)
  ) {
    shouldInclude = false
  }

  // tracker 过滤
  if (
    shouldInclude &&
    trackerFilter.value &&
    trackerFilter.value !== 'all' &&
    !(trackerFilter.value == 'noTracker' && t.trackerStats.length === 0) &&
    !t.trackerStats.some((tracker) => tracker.host.includes(trackerFilter.value))
  ) {
    shouldInclude = false
  }

  // 错误过滤
  if (
    shouldInclude &&
    errorStringFilter.value &&
    errorStringFilter.value !== 'all' &&
    t.cachedError !== errorStringFilter.value
  ) {
    shouldInclude = false
  }

  // 下载目录过滤
  if (
    shouldInclude &&
    downloadDirFilter.value &&
    downloadDirFilter.value !== 'all' &&
    t.downloadDir !== downloadDirFilter.value
  ) {
    shouldInclude = false
  }

  return shouldInclude
}

// 排序
export const sortTorrents = function (
  filtered: Torrent[],
  sortKey: globalThis.Ref<string, string>,
  sortOrder: globalThis.Ref<string, string>
) {
  filtered.sort((a, b) => {
    const aValue = a[sortKey.value as keyof Torrent]
    const bValue = b[sortKey.value as keyof Torrent]
    // 处理 undefined/null
    if (aValue == null && bValue == null) {
      return 0
    }
    if (aValue == null) {
      return sortOrder.value === 'asc' ? -1 : 1
    }
    if (bValue == null) {
      return sortOrder.value === 'asc' ? 1 : -1
    }
    // 数字、字符串、日期
    let result = 0
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      result = sortOrder.value === 'asc' ? aValue - bValue : bValue - aValue
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      result = sortOrder.value === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }
    // 其他类型（如布尔、对象等）
    // result = 0 时，说明字段值相等，需要二次排序
    if (result === 0 && sortKey.value !== 'name') {
      const aName = a.name || ''
      const bName = b.name || ''
      result = aName.localeCompare(bName)
    }
    return result
  })
}

// 获取 torrent 错误
export const getTorrentError = (t: Torrent): string => {
  let torrentError = t.errorString
  let trackerError = ''
  let noTrackerError = false

  for (const trackerStat of t.trackerStats) {
    let err = ''
    if ((trackerStat.hasAnnounced as boolean) && !(trackerStat.lastAnnounceSucceeded as boolean)) {
      err = trackerStat.lastAnnounceResult as string
    }
    if (err === '' || err === 'Success') {
      noTrackerError = true
    } else if (trackerError === '') {
      // If the torrent error string is equal to some tracker error string,
      // then igonore the global error string
      if (err === torrentError) {
        torrentError = ''
      }
      trackerError = `Tracker: ${err}`
    }
  }

  if (noTrackerError || t.status === Status.stopped) {
    return torrentError
  } else {
    return trackerError
  }
}

// 获取 tracker 状态
export const getTrackerAnnounceState = (tracker: TrackerStat) => {
  const $t = i18n.global.t
  if (tracker.announceState === 3) {
    return $t('statusFilter.working') + '(' + $t('status.uploading') + ')'
  }
  if (tracker.hasAnnounced) {
    if (tracker.lastAnnounceSucceeded) {
      return $t('statusFilter.working')
    }
    if (tracker.lastAnnounceResult === 'Success') {
      return $t('statusFilter.working')
    }
    return tracker.lastAnnounceResult
  }
  return ''
}

// 获取 tracker 状态
export const getTrackerStatus = (torrent: Torrent): string => {
  const trackers = torrent.trackerStats
  if (torrent.status === Status.stopped || trackers.length === 0) {
    return ''
  }
  return getTrackerAnnounceState(trackers[0])
}

export const portRe = /:\d+$/
export const prefixRe = /^((t|tr|tk|tracker|bt|open|opentracker)\d*)\.[^.]+\.[^.]+$/

// 获取 torrent 主要 tracker
export const getTorrentMainTracker = (torrent: Torrent): string => {
  if (torrent.trackerStats.length === 0) {
    return '没有 Tracker'
  }
  let host = torrent.trackerStats[0].host as string
  const portMatch = portRe.exec(host)
  if (portMatch != null) {
    host = host.substring(0, portMatch.index)
  }
  const prefixMatch = prefixRe.exec(host)
  if (prefixMatch != null) {
    host = host.substring(prefixMatch[1].length + 1)
  }
  return host
}

// 获取做种总数
export const getSeedsTotal = (torrent: Torrent): number => {
  let seeds = torrent.trackerStats.length > 0 ? 0 : -1
  torrent.trackerStats.forEach((tracker: TrackerStat) => {
    seeds = Math.max(seeds, tracker.seederCount as number)
  })
  return seeds
}

// 获取下载总数
export const getPeersTotal = (torrent: Torrent): number => {
  let peers = torrent.trackerStats.length > 0 ? 0 : -1
  torrent.trackerStats.forEach((tracker: TrackerStat) => {
    peers = Math.max(peers, tracker.leecherCount as number)
  })
  return peers
}

// 处理 torrent 数据
export const processTorrent = (torrent: Torrent) => {
  return {
    ...torrent,
    downloadDir: (torrent.downloadDir as string).replace(/\\/g, '/'),
    cachedError: getTorrentError(torrent),
    cachedTrackerStatus: getTrackerStatus(torrent),
    // 主要的 tracker，并进行格式化
    cachedMainTracker: getTorrentMainTracker(torrent),
    //做种总数
    cachedSeedsTotal: getSeedsTotal(torrent),
    // 当前下载总数
    cachedPeersTotal: getPeersTotal(torrent)
  }
}
