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
  async function clearLegacyDefaultTrackers() {
    if (settingStore.setting.legacyDefaultTrackersMigrated) {
      return
    }
    settingStore.setting.legacyDefaultTrackersMigrated = true
    if (!isLegacyDefaultTrackerList(session.value?.['default-trackers'])) {
      return
    }
    try {
      await rpc.sessionSet({ 'default-trackers': '' })
      if (session.value) {
        session.value['default-trackers'] = ''
      }
    } catch (error) {
      console.warn('Failed to clear legacy default trackers', error)
    }
  }
  async function fetchSession(retry = true) {
    try {
      const res = await rpc.sessionGet()
      if (res?.arguments) {
        session.value = res.arguments
        document.title = `Transmission - ${session.value.version?.replace(/\(.+\)/, '')}`
        // Transmission 4.0（RPC 17）起支持带宽组，站点限速走服务端执行
        settingStore.setSiteLimitServerEnabled(
          rpcVersion.value >= 17 || Boolean(session.value.version?.startsWith('4.'))
        )
        await clearLegacyDefaultTrackers()
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
