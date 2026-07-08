import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import axios from 'axios'
import router from '../router'

// 初始化时尝试从 localStorage 恢复认证信息
const initializeAuth = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('setting') || '{}')
    if (settings.savePassword && settings.savedAuth) {
      setAuth(settings.savedAuth)
    }
  } catch (error) {
    console.warn('Failed to restore auth from localStorage:', error)
  }
}

let domain = ''

export const setDomain = (d: string) => {
  if (!d) {
    return
  }
  domain = d
  instance.defaults.baseURL = getBaseURL()
}

let auth = ''

export const setAuth = (authString: string) => {
  if (!authString) {
    return
  }
  auth = authString
  instance.defaults.headers.Authorization = `Basic ${auth}`
}

const getBaseURL = () => {
  if (domain.endsWith('/')) {
    domain = domain.slice(0, -1)
  }
  if (!domain.endsWith('transmission/rpc')) {
    return `${domain}/transmission/rpc`
  }
  return domain
}

let sessionId = ''

const instance: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 600000
})

// 初始化认证信息
initializeAuth()

instance.interceptors.request.use((config) => {
  if (sessionId) {
    config.headers['X-Transmission-Session-Id'] = sessionId
  }
  if (auth) {
    config.headers.Authorization = `Basic ${auth}`
  }
  return config
})

instance.interceptors.response.use(
  (res) => {
    return res
  },
  async (error) => {
    const { response, config } = error
    if (response) {
      if (response.status === 409) {
        // 获取新的 session id 并重试
        sessionId = response.headers['x-transmission-session-id']
        config.headers['X-Transmission-Session-Id'] = sessionId
        return instance(config)
      } else if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404 ||
        response.status === 405
      ) {
        // 401 需要重新登录
        sessionId = ''
        config.headers['X-Transmission-Session-Id'] = ''
        if (router.currentRoute.value.path !== '/login') {
          // 跳转到登录页面
          router.replace('/login')
        }
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

// ================== TS 类型声明 ==================

// Session Get/Set
export interface SessionArguments {
  /** 默认下载目录 */
  'download-dir': string
  /** 未完成下载的临时目录（可选） */
  'incomplete-dir'?: string
  /** 最大全局下载速度（KB/s） */
  'speed-limit-down'?: number
  /** 是否启用最大下载速度限制 */
  'speed-limit-down-enabled'?: boolean
  /** 最大全局上传速度（KB/s） */
  'speed-limit-up'?: number
  /** 是否启用最大上传速度限制 */
  'speed-limit-up-enabled'?: boolean
  /** 监听的端口号 */
  'peer-port'?: number
  /** RPC 登录用户名 */
  'rpc-username'?: string
  /** RPC 登录密码 */
  'rpc-password'?: string
  /** Blocklist 列表地址 */
  'blocklist-url'?: string
  /** 是否启用备用速度（如夜间限速） */
  'alt-speed-enabled'?: boolean
  /** 是否启用 DHT（分布式哈希表） */
  'dht-enabled'?: boolean
  /** 是否启用 LPD（本地对等发现） */
  'lpd-enabled'?: boolean
  /** 是否启用 PEX（对等节点交换） */
  'pex-enabled'?: boolean
  /** 是否启用 uTP 协议 */
  'utp-enabled'?: boolean
  /** 连接加密方式（required/ preferred/ tolerated） */
  encryption?: 'required' | 'preferred' | 'tolerated'
  /** 是否启用队列卡死检测 */
  'queue-stalled-enabled'?: boolean
  /** 队列卡死判定分钟数 */
  'queue-stalled-minutes'?: number
  /** 默认做种分享率限制 */
  'seed-ratio-limit'?: number
  /** 是否启用默认做种分享率限制 */
  'seed-ratio-limited'?: boolean
  /** 新增种子后是否自动开始 */
  'start-added-torrents'?: boolean
  /** 添加种子后是否自动删除原 .torrent 文件 */
  'trash-original-torrent-files'?: boolean
  /** 单位信息（如速度、大小单位） */
  units?: any
  /** 是否启用种子完成脚本 */
  'script-torrent-done-enabled'?: boolean
  /** 种子完成脚本路径 */
  'script-torrent-done-filename'?: string
  /** 备用最大下载速度（KB/s） */
  'alt-speed-down'?: number
  /** 备用速度启用起始时间（分钟，午夜为0） */
  'alt-speed-time-begin'?: number
  /** 备用速度启用的星期（bitmask，0=周日） */
  'alt-speed-time-day'?: number
  /** 是否启用备用速度定时 */
  'alt-speed-time-enabled'?: boolean
  /** 备用速度结束时间（分钟） */
  'alt-speed-time-end'?: number
  /** 备用最大上传速度（KB/s） */
  'alt-speed-up'?: number
  /** 是否启用防爆破登录 */
  'anti-brute-force-enabled'?: boolean
  /** 爆破阈值（失败次数） */
  'anti-brute-force-threshold'?: number
  /** 是否启用 Blocklist */
  'blocklist-enabled'?: boolean
  /** Blocklist 规则条数 */
  'blocklist-size'?: number
  /** 磁盘缓存大小（MB） */
  'cache-size-mb'?: number
  /** 配置文件目录 */
  'config-dir'?: string
  /** 默认 Tracker 列表（换行分隔） */
  'default-trackers'?: string
  /** 下载目录剩余空间（字节，已废弃） */
  'download-dir-free-space'?: number
  /** 是否启用下载队列限制 */
  'download-queue-enabled'?: boolean
  /** 最大同时下载任务数 */
  'download-queue-size'?: number
  /** 做种空闲限制（分钟） */
  'idle-seeding-limit'?: number
  /** 是否启用做种空闲限制 */
  'idle-seeding-limit-enabled'?: boolean
  /** 是否启用未完成目录 */
  'incomplete-dir-enabled'?: boolean
  /** 全局最大连接数 */
  'peer-limit-global'?: number
  /** 单任务最大连接数 */
  'peer-limit-per-torrent'?: number
  /** 启动时是否随机端口 */
  'peer-port-random-on-start'?: boolean
  /** 是否启用端口转发（UPnP/NAT-PMP） */
  'port-forwarding-enabled'?: boolean
  /** 未完成文件是否加 .part 后缀 */
  'rename-partial-files'?: boolean
  /** 当前 RPC 协议版本号 */
  'rpc-version'?: number
  /** 最低兼容的 RPC 协议版本号 */
  'rpc-version-minimum'?: number
  /** 当前 RPC 协议 semver 字符串 */
  'rpc-version-semver'?: string
  /** 是否启用种子添加脚本 */
  'script-torrent-added-enabled'?: boolean
  /** 种子添加脚本路径 */
  'script-torrent-added-filename'?: string
  /** 是否启用做种完成脚本 */
  'script-torrent-done-seeding-enabled'?: boolean
  /** 做种完成脚本路径 */
  'script-torrent-done-seeding-filename'?: string
  /** 是否启用做种队列限制 */
  'seed-queue-enabled'?: boolean
  /** 最大同时做种任务数 */
  'seed-queue-size'?: number
  /** 当前会话 ID（X-Transmission-Session-Id） */
  'session-id'?: string
  /** 是否启用 TCP 传输 */
  'tcp-enabled'?: boolean
  /** Transmission 版本号 */
  version?: string
  [key: string]: any
}
export interface SessionGetResponse {
  arguments: SessionArguments
  result: string
}
export type SessionSetArgs = Partial<SessionArguments>

/**
 * session-stats 接口返回的统计条目
 * - downloadedBytes: 累计下载字节数
 * - uploadedBytes: 累计上传字节数
 * - filesAdded: 累计添加文件数
 * - sessionCount: 会话次数
 * - secondsActive: 活跃秒数
 */
export interface SessionStatsEntry {
  downloadedBytes: number
  uploadedBytes: number
  filesAdded: number
  sessionCount: number
  secondsActive: number
}

/**
 * session-stats 接口返回的 arguments 字段结构
 * - activeTorrentCount: 活跃种子数
 * - pausedTorrentCount: 暂停种子数
 * - torrentCount: 总种子数
 * - downloadSpeed: 当前全局下载速度
 * - uploadSpeed: 当前全局上传速度
 * - cumulative-stats: 累计统计
 * - current-stats: 当前会话统计
 */
export interface SessionStatsArguments {
  activeTorrentCount: number
  pausedTorrentCount: number
  torrentCount: number
  downloadSpeed: number
  uploadSpeed: number
  'cumulative-stats': SessionStatsEntry
  'current-stats': SessionStatsEntry
}

/**
 * session-stats 接口完整响应
 */
export interface SessionStatsResponse {
  arguments: SessionStatsArguments
  result: string
}

export interface TorrentOther {
  /** 缓存错误 */
  cachedError?: string
  /** 缓存 tracker 状态 */
  cachedTrackerStatus: string
  /** 主 tracker */
  cachedMainTracker: string
  /** 缓存种子数 */
  cachedSeedsTotal: number
  /** 缓存 peer 数 */
  cachedPeersTotal: number
}
/**
 * 种子（Torrent）信息结构
 */
export interface Torrent extends TorrentOther {
  /** 已下载字节数 */
  downloadedEver: number
  /** 已上传字节数 */
  uploadedEver: number
  /** 添加时间（Unix 时间戳，秒） */
  addedDate: number
  /** 完成时间（Unix 时间戳，秒） */
  doneDate?: number
  /** 最后活动时间（Unix 时间戳，秒） */
  activityDate?: number
  /** 预计剩余时间（秒） */
  eta?: number
  /** 带宽优先级 */
  bandwidthPriority: number
  /** 下载目录 */
  downloadDir: string
  /** 错误码，0 表示无错误 */
  error: number
  /** 错误描述 */
  errorString: string
  /** 已校验的数据量（字节） */
  haveValid: number
  /** 唯一 id */
  id: number
  /** 标签列表 */
  labels: string[]
  /** 剩余未完成的数据量（字节） */
  leftUntilDone: number
  /** 磁力链接 */
  magnetLink: string
  /** 种子名称 */
  name: string
  /** 是否顺序下载 */
  sequentialDownload: boolean
  /** 是否私有种子 */
  isPrivate?: boolean
  /** 正在从本客户端下载的 peer 数 */
  peersGettingFromUs: number
  /** 正在向本客户端上传的 peer 数 */
  peersSendingToUs: number
  /** 完成百分比，0~1 之间的小数 */
  percentDone: number
  /** 分片数量 */
  pieceCount: number
  /** 每个分片大小（字节） */
  pieceSize?: number
  /** 当前下载速度（字节/秒） */
  rateDownload: number
  /** 当前上传速度（字节/秒） */
  rateUpload: number
  /** 做种时长（秒） */
  secondsSeeding: number
  /** 完成后总大小（字节） */
  sizeWhenDone: number
  /** 状态码 */
  status: number
  /** 队列位置 */
  queuePosition?: number
  /** 总大小（字节） */
  totalSize: number
  /** Tracker 信息数组 */
  trackerStats: TrackerStat[]
  /** 种子 tracker 列表 */
  // RPC Version >= 17
  trackerList: string
  /** 分享率 */
  uploadRatio: number
  /** SHA1 或 BTIH 哈希 */
  hashString?: string
  /** 重新校验进度 0-1 */
  recheckProgress?: number
  /** Peers 列表（详情） */
  peers?: Peer[]
  /** Peers 来源统计（详情） */
  peersFrom?: PeersFrom
  /** 如果为 true，则遵守会话上传限制 */
  honorsSessionLimits?: boolean
  /** 种子级别的做种不活动时间限制（分钟数） */
  seedIdleLimit?: number
  /** 使用哪种做种不活动模式。参见 tr_idlelimit */
  // Use global (0), torrent (1), or unlimited (2) limit.
  seedIdleMode?: number
  /** 种子级别的分享率 */
  seedRatioLimit?: number
  /** 是否启用种子级别的分享率限制 */
  seedRatioLimited?: boolean
  /** 使用哪种分享率模式。参见 tr_ratiolimit */
  // Use global (0), torrent (1), or unlimited (2) limit.
  seedRatioMode?: number
  /** 按顺序下载种子片段 */
  sequential_download?: boolean
  /** 如果为 true，则遵守 downloadLimit */
  downloadLimited?: boolean
  /** 最大下载速度 (KBps) */
  downloadLimit?: number
  /** 如果为 true，则遵守 uploadLimit */
  uploadLimited?: boolean
  /** 最大上传速度 (KBps) */
  uploadLimit?: number
  /** 最大连接数 */
  'peer-limit'?: number
  /** 文件列表 */
  files?: TorrentFile[]
  /** 文件状态列表 */
  fileStats?: TorrentFileStats[]
  /** 创建时间 */
  dateCreated?: number
  /** 创建者 */
  creator?: string
  /** 注释 */
  comment?: string
  /** 损坏的块数 */
  corruptEver?: number
  /** 备用带宽组 */
  group?: string
  /** 最大连接数 */
  maxConnectedPeers?: number
}

export interface TorrentFile {
  bytesCompleted: number
  length: number
  begin_piece: number
  end_piece: number
  name: string
}

export interface TorrentFileStats {
  bytesCompleted: number
  wanted: boolean
  priority: number
}

export interface Peer {
  address: string
  clientName: string
  clientIsChoked?: boolean
  clientIsInterested?: boolean
  flagStr?: string
  isDownloadingFrom?: boolean
  isUploadingTo?: boolean
  peerIsChoked?: boolean
  peerIsInterested?: boolean
  port?: number
  progress?: number
  rateToClient?: number
  rateToPeer?: number
}

export interface PeersFrom {
  fromCache?: number
  fromDht?: number
  fromIncoming?: number
  fromLpd?: number
  fromLtep?: number
  fromPex?: number
  fromTracker?: number
}

/**
 * Tracker 信息结构
 */
export interface TrackerStat {
  /** announce 地址 */
  announce: string
  /** announce 状态 */
  announceState: number
  /** 下载次数 */
  downloadCount: number
  /** 是否已 announce */
  hasAnnounced: boolean
  /** 是否已 scrape */
  hasScraped: boolean
  /** 主机 */
  host: string
  /** tracker 唯一 id */
  id: number
  /** 是否为备选 tracker */
  isBackup: boolean
  /** 上次 announce peer 数 */
  lastAnnouncePeerCount: number
  /** 上次 announce 结果 */
  lastAnnounceResult: string
  /** 上次 announce 开始时间（Unix 秒） */
  lastAnnounceStartTime: number
  /** 上次 announce 是否成功 */
  lastAnnounceSucceeded: boolean
  /** 上次 announce 时间（Unix 秒） */
  lastAnnounceTime: number
  /** 上次 announce 是否超时 */
  lastAnnounceTimedOut: boolean
  /** 上次 scrape 结果 */
  lastScrapeResult: string
  /** 上次 scrape 开始时间（Unix 秒） */
  lastScrapeStartTime: number
  /** 上次 scrape 是否成功 */
  lastScrapeSucceeded: boolean
  /** 上次 scrape 时间（Unix 秒） */
  lastScrapeTime: number
  /** 上次 scrape 是否超时 */
  lastScrapeTimedOut: boolean
  /** 当前 leecher 数 */
  leecherCount: number
  /** 下次 announce 时间（Unix 秒） */
  nextAnnounceTime: number
  /** 下次 scrape 时间（Unix 秒） */
  nextScrapeTime: number
  /** scrape 地址 */
  scrape: string
  /** scrape 状态 */
  scrapeState: number
  /** 当前 seeder 数 */
  seederCount: number
  /** 站点名 */
  sitename: string
  /** tracker 分组（tier） */
  tier: number
}

export interface TorrentGetResponse {
  arguments: { torrents: Torrent[] }
  result: string
}
export interface TorrentAddArgs {
  /** 下载种子的目标路径 */
  'download-dir'?: string
  /** .torrent 文件的文件名或 URL */
  filename?: string
  /** 字符串标签数组 */
  labels?: string[]
  /** Base64 编码的 .torrent 文件内容 */
  metainfo?: string
  /** 如果为 true，不自动启动种子 */
  paused?: boolean
  /** 最大对等节点数 */
  'peer-limit'?: number
  /** 种子的带宽优先级 (tr_priority_t) */
  bandwidthPriority?: number
  /** 需要下载的文件索引 */
  'files-wanted'?: number[]
  /** 不需要下载的文件索引 */
  'files-unwanted'?: number[]
  /** 高优先级文件索引 */
  'priority-high'?: number[]
  /** 低优先级文件索引 */
  'priority-low'?: number[]
  /** 普通优先级文件索引 */
  'priority-normal'?: number[]
  /** 按顺序下载种子片段 */
  sequential_download?: boolean
}
export interface TorrentAddArguments {
  'torrent-duplicate': {
    hashString: string
    name: string
    id: number
  }
  'torrent-add': {
    hashString: string
    name: string
    id: number
  }
}
export interface TorrentAddResponse {
  arguments: TorrentAddArguments
  result: string
}
export interface TorrentSetArgs {
  /** 种子 ID 列表 */
  ids: number[] | number
  /** 种子的带宽优先级 (tr_priority_t) */
  bandwidthPriority?: number
  /** 最大下载速度 (KBps) */
  downloadLimit?: number
  /** 如果为 true，则遵守 downloadLimit */
  downloadLimited?: boolean
  /** 不需要下载的文件索引 */
  'files-unwanted'?: number[]
  /** 需要下载的文件索引 */
  'files-wanted'?: number[]
  /** 此种子所属的带宽组名称 */
  group?: string
  /** 如果为 true，则遵守会话上传限制 */
  honorsSessionLimits?: boolean
  /** 字符串标签数组 */
  labels?: string[]
  /** 种子内容的新位置 */
  location?: string
  /** 最大对等节点数 */
  'peer-limit'?: number
  /** 高优先级文件索引 */
  'priority-high'?: number[]
  /** 低优先级文件索引 */
  'priority-low'?: number[]
  /** 普通优先级文件索引 */
  'priority-normal'?: number[]
  /** 此种子在其队列中的位置 [0...n) */
  queuePosition?: number
  /** 种子级别的做种不活动时间限制（分钟数） */
  seedIdleLimit?: number
  /** 使用哪种做种不活动模式。参见 tr_idlelimit */
  // Use global (0), torrent (1), or unlimited (2) limit.
  seedIdleMode?: number
  /** 种子级别的分享率 */
  seedRatioLimit?: number
  /** 使用哪种分享率模式。参见 tr_ratiolimit */
  // Use global (0), torrent (1), or unlimited (2) limit.
  seedRatioMode?: number
  /** 按顺序下载种子片段 */
  sequential_download?: boolean
  /** 宣布 URL 字符串，每行一个，层之间用空行分隔 */
  trackerList?: string
  /** 要追加的宣布 URL 字符串数组 */
  trackerAdd?: string[]
  /** 最大上传速度 (KBps) */
  uploadLimit?: number
  /** 如果为 true，则遵守 uploadLimit */
  uploadLimited?: boolean
  /** 其它扩展属性 */
  [key: string]: any
}

// ================== 通用 RPC 调用 ==================
export async function callRpc<T = any>(
  method: string,
  args: object = {},
  config: AxiosRequestConfig = {}
): Promise<T | undefined> {
  try {
    const res = await instance.post('', { method, arguments: args }, config)
    if (res.status !== 200) {
      throw new Error('RPC failed')
    }
    return res.data
  } catch (error) {
    throw new Error('RPC failed')
  }
}
// ================== 高版本 RPC 封装 ==================
export const rpc = {
  // 会话相关
  sessionGet: () => callRpc<SessionGetResponse>('session-get'),
  sessionSet: (args: SessionSetArgs) => callRpc('session-set', args),
  sessionStats: () => callRpc<SessionStatsResponse>('session-stats'),

  // 种子相关
  torrentGet: (
    fields: string[] = [
      'id',
      'name',
      'status',
      'totalSize',
      'percentDone',
      'rateDownload',
      'rateUpload',
      'error',
      'errorString',
      'tags'
    ],
    ids?: number[] | number,
    config?: AxiosRequestConfig
  ) => callRpc<TorrentGetResponse>('torrent-get', { fields, ...(ids ? { ids } : {}) }, config),
  torrentAdd: (args: TorrentAddArgs) => callRpc<TorrentAddResponse>('torrent-add', args),
  torrentRemove: async (ids: number[] | number, deleteData = false) => {
    const res = await callRpc('torrent-remove', { ids, 'delete-local-data': deleteData })
    if (res?.result === 'success') {
      return true
    }
    return false
  },
  torrentStart: (ids: number[] | number) => callRpc('torrent-start', { ids }),
  torrentStartNow: (ids: number[] | number) => callRpc('torrent-start-now', { ids }),
  torrentStop: (ids: number[] | number) => callRpc('torrent-stop', { ids }),
  torrentVerify: (ids: number[] | number) => callRpc('torrent-verify', { ids }),
  torrentReannounce: (ids: number[] | number) => callRpc('torrent-reannounce', { ids }),
  torrentSet: (args: TorrentSetArgs) => callRpc('torrent-set', args),
  torrentSetLocation: (ids: number[] | number, location: string, move: boolean = true) =>
    callRpc('torrent-set-location', { ids, location, move }),
  // 队列相关
  queueMoveTop: (ids: number[] | number) => callRpc('queue-move-top', { ids }),
  queueMoveUp: (ids: number[] | number) => callRpc('queue-move-up', { ids }),
  queueMoveDown: (ids: number[] | number) => callRpc('queue-move-down', { ids }),
  queueMoveBottom: (ids: number[] | number) => callRpc('queue-move-bottom', { ids }),

  // Blocklist
  blocklistUpdate: () => callRpc('blocklist-update'),
  blocklistGet: () => callRpc('blocklist-get'),

  // 空间
  freeSpace: (path: string) => callRpc('free-space', { path }),

  // 端口
  portTest: () => callRpc('port-test'),

  // 标签（高版本支持）
  tagGet: () => callRpc('tag-get'),
  tagSet: (args: object) => callRpc('tag-set', args),
  tagRemove: (ids: number[] | number) => callRpc('tag-remove', { ids }),

  // 系统操作（高版本支持）
  systemShutdown: () => callRpc('system-shutdown'),
  systemHibernate: () => callRpc('system-hibernate'),
  systemSleep: () => callRpc('system-sleep'),

  // 其它高版本支持的接口
  torrentFiles: (ids: number[] | number) => callRpc('torrent-get', { fields: ['files'], ids }),
  torrentFileStats: (ids: number[] | number) => callRpc('torrent-get', { fields: ['fileStats'], ids }),
  torrentRenamePath: (ids: number[] | number, path: string, name: string) =>
    callRpc('torrent-rename-path', { ids, path, name })
}
