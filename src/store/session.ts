import type { SessionArguments } from '@/api/rpc'
import { rpc } from '@/api/rpc'
import { sleep } from '@/utils'
import { isLegacyDefaultTrackerList, useSettingStore } from '@/store/setting'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSessionStore = defineStore('session', () => {
  const session = ref<SessionArguments | null>(null)
  const settingStore = useSettingStore()
  // 注意我们这里最低支持 17的rpc 版本
  const rpcVersion = computed(() => session.value?.['rpc-version'] || 17)
  async function clearLegacyDefaultTrackers(endpoint: string, currentSession: SessionArguments) {
    const migratedServers = settingStore.setting.legacyDefaultTrackersMigratedServers
    if (migratedServers.includes(endpoint)) {
      return
    }
    // 仅当服务端确为旧默认列表时才需要清理；否则直接标记完成，避免重复检查。
    if (!isLegacyDefaultTrackerList(currentSession['default-trackers'])) {
      migratedServers.push(endpoint)
      return
    }
    try {
      const res = await rpc.sessionSet({ 'default-trackers': '' })
      if (res?.result !== 'success') {
        throw new Error(res?.result || 'Failed to clear legacy default trackers')
      }
      currentSession['default-trackers'] = ''
      // 清理成功后再落标记，失败时下次仍会重试。
      migratedServers.push(endpoint)
    } catch (error) {
      console.warn('Failed to clear legacy default trackers', error)
    }
  }
  async function fetchSession(retry = true) {
    const domain = settingStore.setting.domain
    try {
      const res = await rpc.sessionGet()
      // 忽略切换服务端前发出的请求，避免拿旧响应清理新的服务端。
      if (domain !== settingStore.setting.domain) {
        return false
      }
      if (res?.arguments) {
        session.value = res.arguments
        document.title = `Transmission - ${session.value.version?.replace(/\(.+\)/, '')}`
        // Transmission 4.0（RPC 17）起支持带宽组，站点限速走服务端执行
        settingStore.setSiteLimitServerEnabled(
          rpcVersion.value >= 17 || Boolean(session.value.version?.startsWith('4.'))
        )
        const base = domain.replace(/\/+$/, '')
        const endpoint = new URL(base.endsWith('/transmission/rpc') ? base : `${base}/transmission/rpc`).href
        await clearLegacyDefaultTrackers(endpoint, session.value)
        return true
      }
    } catch (e: any) {
      if (retry && e?.response?.status === 409) {
        await sleep(500)
        return await fetchSession(false)
      }
    }
    return false
  }
  const interval = computed(() => settingStore.setting.polling.sessionInterval * 1000)
  const { pause: stopPolling, resume: startPolling } = useIntervalFn(fetchSession, interval, { immediate: false })

  return { session, fetchSession, rpcVersion, startPolling, stopPolling }
})
