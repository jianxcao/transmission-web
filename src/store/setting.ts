import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { useThemeVars, type CustomThemeCommonVars, type ThemeCommonVars } from 'naive-ui'
import { setDomain as setDomainApi, setAuth as setAuthApi } from '@/api/rpc'
import { setLocale } from '@/i18n'

const DEFAULT_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'udp://wepzone.net:6969/announce',
  'udp://ttk2.nbaonlineservice.com:6969/announce',
  'udp://tracker.tryhackx.org:6969/announce',
  'udp://tracker.theoks.net:6969/announce',
  'udp://tracker.srv00.com:6969/announce',
  'udp://tracker.ololosh.space:6969/announce',
  'udp://tracker.fnix.net:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://t.overflow.biz:6969/announce',
  'udp://retracker01-msk-virt.corbina.net:80/announce',
  'udp://public.tracker.vraphim.com:6969/announce',
  'udp://p4p.arenabg.com:1337/announce',
  'udp://opentracker.io:6969/announce',
  'udp://open.dstud.io:6969/announce'
]

export interface IPolling {
  sessionInterval: number
  torrentDetailInterval: number
  torrentInterval: number
}

export interface TrackerLimitRule {
  id: string
  enabled: boolean
  pattern: string
  uploadLimit: number | null
  downloadLimit: number | null
}

const normalizeTrackerLimitRules = (value: unknown): TrackerLimitRule[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `tracker-rule-${index}`,
      enabled: item.enabled !== false,
      pattern: typeof item.pattern === 'string' ? item.pattern : '',
      uploadLimit: typeof item.uploadLimit === 'number' && Number.isFinite(item.uploadLimit) ? item.uploadLimit : null,
      downloadLimit:
        typeof item.downloadLimit === 'number' && Number.isFinite(item.downloadLimit) ? item.downloadLimit : null
    }))
}

export const useSettingStore = defineStore('setting', () => {
  const setting = useStorage(
    'setting',
    {
      theme: 'light',
      language: 'zh-CN',
      defaultTrackers: DEFAULT_TRACKERS,
      domain: window.location.origin,
      savePassword: false,
      singleLine: true,
      auth: '',
      polling: {
        sessionInterval: 60,
        torrentDetailInterval: 5,
        torrentInterval: 5
      },
      menuExpandedKeys: ['status', 'labels'],
      // 目录侧边栏展示模式：list = 扁平展示所有目录；tree = 按层级折叠
      dirMenuMode: 'list' as 'list' | 'tree',
      // 添加种子/修改目录时是否使用历史下载目录作为联想
      enableDownloadDirSuggestions: true,
      // 用户自定义的下载目录字典（始终用于联想，不受历史联想开关影响）
      customDownloadDirs: [] as string[],
      // 忽略域名中的部分前缀
      ignoredTrackerPrefixes: ['t', 'tr', 'tk', 'tracker', 'bt', 'open', 'opentracker', 'pt'],
      // 按 tracker 域名匹配的种子级限速规则
      trackerLimitRules: [] as TrackerLimitRule[]
    },
    localStorage,
    { mergeDefaults: true, deep: true, writeDefaults: true }
  )
  // 旧版本默认展开目录，升级时仅迁移这组默认值；用户自定义的展开状态保持不变。
  if (
    Array.isArray(setting.value.menuExpandedKeys) &&
    setting.value.menuExpandedKeys.length === 3 &&
    ['status', 'labels', 'dir'].every((key) => setting.value.menuExpandedKeys.includes(key))
  ) {
    setting.value.menuExpandedKeys = ['status', 'labels']
  }
  // 兼容早期版本可能写入的 null/非法规则，避免页面初始化时调用 trim 崩溃。
  const normalizedTrackerRules = normalizeTrackerLimitRules(setting.value.trackerLimitRules)
  if (JSON.stringify(normalizedTrackerRules) !== JSON.stringify(setting.value.trackerLimitRules)) {
    setting.value.trackerLimitRules = normalizedTrackerRules
  }
  // 侧边栏宽度
  const sidebarWidth = useStorage('sidebarWidth', 224, undefined)

  // 详情高度-pc 端生效
  const detailHeight = useStorage('detailHeight', 280)

  const headerHeight = ref(56)
  const footerHeight = ref(32)

  const authSession = useStorage('auth', '', sessionStorage, { mergeDefaults: true, deep: true, writeDefaults: true })

  function setDomain(val: string) {
    setting.value.domain = val
    setDomainApi(val)
  }

  setDomain(setting.value.domain)

  // 初始化语言设置
  watchEffect(() => {
    if (setting.value.language) {
      setLocale(setting.value.language)
    }
  })

  const serverHost = computed(() => {
    return setting.value.domain.replace(/^https?:\/\//, '')
  })

  const safeArea = reactive({
    top: 0,
    bottom: 0
  })

  const doc = document.documentElement
  const docStyle = window.getComputedStyle(doc)
  safeArea.top = parseInt(docStyle.getPropertyValue('--top-inset')) || 0
  safeArea.bottom = parseInt(docStyle.getPropertyValue('--bottom-inset')) || 0
  const themeDefault = useThemeVars()

  const themeVars = ref<ThemeCommonVars & CustomThemeCommonVars>(themeDefault.value)

  const lineHeight = computed(() => {
    if (themeVars.value.lineHeight && themeVars.value.lineHeight.endsWith('px')) {
      return parseInt(themeVars.value.lineHeight)
    }
    return Math.round(parseInt(themeVars.value.fontSize) * parseFloat(themeVars.value.lineHeight)) || 22
  })

  const lineHeightMini = computed(() => {
    return Number(Math.round(parseInt(themeVars.value.fontSizeMini) * 1.2).toFixed(0))
  })

  function setTheme(val: string) {
    setting.value.theme = val
  }

  function setLanguage(val: string) {
    setting.value.language = val
    setLocale(val)
  }

  function setThemeVars(val: ThemeCommonVars & CustomThemeCommonVars) {
    themeVars.value = val
  }

  function setAuth(username: string, password: string) {
    if (!username || !password) {
      return ''
    }
    const auth = btoa(username + ':' + password)

    // 如果启用记住密码，则保存 auth
    if (setting.value.savePassword) {
      setting.value.auth = auth
    } else {
      authSession.value = auth
    }
    return auth
  }

  function setSavePassword(val: boolean) {
    setting.value.savePassword = val
    if (val) {
      authSession.value = ''
    } else {
      setting.value.auth = ''
    }
  }

  function setPolling(val: IPolling) {
    setting.value.polling = val
  }

  watch(
    [() => authSession.value, () => setting.value.auth],
    () => {
      setAuthApi(authSession.value || setting.value.auth)
    },
    {
      immediate: true,
      flush: 'pre'
    }
  )

  const changeIgnoredTrackerPrefixes = (prefixes: string[]) => {
    setting.value.ignoredTrackerPrefixes = prefixes
  }


  // 菜单展开状态
  const menuExpandedKeys = computed({
    get: () => setting.value.menuExpandedKeys,
    set: (val) => {
      setting.value.menuExpandedKeys = val
    }
  })

  return {
    setting,
    setTheme,
    setLanguage,
    themeVars,
    setThemeVars,
    safeArea,
    lineHeight,
    lineHeightMini,
    serverHost,
    setDomain,
    setAuth,
    setSavePassword,
    setPolling,
    sidebarWidth,
    detailHeight,
    headerHeight,
    footerHeight,
    changeIgnoredTrackerPrefixes,
    menuExpandedKeys
  }
})
