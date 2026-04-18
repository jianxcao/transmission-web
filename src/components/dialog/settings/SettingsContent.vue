<template>
  <n-spin :show="sessionLoading" v-if="sessionLoading" class="h-[100vh]"></n-spin>
  <n-el v-else class="settings-content" :class="props.class">
    <!-- Tabs 内容区域 -->
    <n-tabs
      v-model:value="currentTab"
      type="line"
      placement="top"
      :animated="true"
      class="flex-1 pb-2 tabs"
      :class="props.tabWrapperClass"
    >
      <n-tab-pane name="polling" :tab="$t('settings.polling')">
        <div>
          <PollingSettings v-model:form="pollingForm" />
        </div>
      </n-tab-pane>
      <n-tab-pane name="download" :tab="$t('settings.download')">
        <div>
          <DownloadSettings v-model:form="sessionForm" />
        </div>
      </n-tab-pane>
      <n-tab-pane name="network" :tab="$t('settings.network')">
        <div>
          <NetworkSettings v-model:form="sessionForm" />
        </div>
      </n-tab-pane>
      <n-tab-pane name="bandwidth" :tab="$t('settings.bandwidth')">
        <div>
          <BandwidthSettings v-model:form="sessionForm" />
        </div>
      </n-tab-pane>
      <n-tab-pane name="queue" :tab="$t('settings.queue')">
        <div>
          <QueueSettings v-model:form="sessionForm" />
        </div>
      </n-tab-pane>
      <n-tab-pane name="other" :tab="$t('settings.other')">
        <div>
          <OtherSettings v-model:form="sessionForm" />
        </div>
      </n-tab-pane>
    </n-tabs>
    <!-- 吸底保存按钮 -->
    <div class="settings-footer">
      <n-button v-if="isDialog" @click="onCancel" :loading="loading" size="large">{{ $t('common.cancel') }}</n-button>
      <n-button type="primary" @click="onSave" :loading="loading" size="large">{{ $t('common.save') }}</n-button>
    </div>
  </n-el>
</template>

<script setup lang="ts">
import { rpc, type SessionArguments } from '@/api/rpc'
import { useSettingStore } from '@/store/setting'
import { useMessage } from 'naive-ui'
import { useSessionStore } from '@/store'
import { omit } from 'lodash-es'
import { useI18n } from 'vue-i18n'
const sessionStore = useSessionStore()
const { t: $t } = useI18n()

interface Props {
  // 是否是弹窗模式
  isDialog?: boolean
  class?: string
  tabWrapperClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  isDialog: false,
  class: '',
  tabWrapperClass: ''
})

const emit = defineEmits<{
  'save-success': []
  cancel: []
}>()
const session = computed(() => sessionStore.session)
const sessionLoading = ref(false)
const message = useMessage()
const loading = ref(false)
const settingStore = useSettingStore()

const currentTab = ref('polling')
const sessionForm = ref<SessionArguments>({
  'download-dir': ''
})
const pollingForm = ref<{
  sessionInterval: number
  torrentDetailInterval: number
  torrentInterval: number
}>({
  sessionInterval: 10,
  torrentDetailInterval: 3,
  torrentInterval: 5
})
const formInit = () => {
  //----- 下载设置 -----
  sessionForm.value['download-dir'] = session.value?.['download-dir'] || ''
  //未完成文件是否加 .part 后缀
  sessionForm.value['rename-partial-files'] = !!session.value?.['rename-partial-files']
  //是否启用未完成目录
  sessionForm.value['incomplete-dir-enabled'] = !!session.value?.['incomplete-dir-enabled']
  //未完成下载的临时目录（可选）
  sessionForm.value['incomplete-dir'] = session.value?.['incomplete-dir'] || ''
  //默认分享率上限
  sessionForm.value['seedRatioLimit'] = session.value?.['seedRatioLimit'] || 2.0
  //是否启用种子级别的分享率限制
  sessionForm.value['seedRatioLimited'] = !!session.value?.['seedRatioLimited']
  //使用哪种分享率模式。参见 tr_ratiolimit
  sessionForm.value['seedRatioMode'] = session.value?.['seedRatioMode'] || 0
  //默认停止无流量种子持续时间
  sessionForm.value['idle-seeding-limit'] = session.value?.['idle-seeding-limit'] || 30
  //是否启用做种空闲限制
  sessionForm.value['idle-seeding-limit-enabled'] = !!session.value?.['idle-seeding-limit-enabled']
  //磁盘缓存大小
  sessionForm.value['cache-size-mb'] = session.value?.['cache-size-mb'] || 4

  // 网络设置
  // 监听的端口号
  sessionForm.value['peer-port'] = session.value?.['peer-port'] || 51413
  // 启动时随机选择端口
  sessionForm.value['peer-port-random-on-start'] = !!session.value?.['peer-port-random-on-start']
  // 启用端口转发 (UPnP)
  sessionForm.value['port-forwarding-enabled'] = !!session.value?.['port-forwarding-enabled']
  // 加密
  sessionForm.value.encryption = session.value?.['encryption'] || 'preferred'
  // 全局最大链接数
  sessionForm.value['peer-limit-global'] = session.value?.['peer-limit-global'] || 200
  // 单种最大链接数
  sessionForm.value['peer-limit-per-torrent'] = session.value?.['peer-limit-per-torrent'] || 50
  // 启用用户交换
  sessionForm.value['pex-enabled'] = !!session.value?.['pex-enabled']
  // 启用分布式哈希表 (DHT)
  sessionForm.value['dht-enabled'] = !!session.value?.['dht-enabled']
  // 启用本地用户发现 (LPD)
  sessionForm.value['lpd-enabled'] = !!session.value?.['lpd-enabled']
  // 启用带宽管理 (μTP)
  sessionForm.value['utp-enabled'] = !!session.value?.['utp-enabled']
  // 启用黑名单列表
  sessionForm.value['blocklist-url'] = session.value?.['blocklist-url'] || 'http://www.example.com/blocklist'
  // 启用黑名单
  sessionForm.value['blocklist-enabled'] = !!session.value?.['blocklist-enabled']
  // 黑名单规则数量
  sessionForm.value['blocklist-size'] = session.value?.['blocklist-size'] || 0

  // 队列设置
  // 是否启用队列卡死检测
  sessionForm.value['queue-stalled-enabled'] = !!session.value?.['queue-stalled-enabled']
  // 队列卡死判定分钟数
  sessionForm.value['queue-stalled-minutes'] = session.value?.['queue-stalled-minutes'] || 30
  // 是否启用做种分享率限制
  sessionForm.value['seed-ratio-limited'] = !!session.value?.['seed-ratio-limited']
  // 默认做种分享率限制
  sessionForm.value['seed-ratio-limit'] = session.value?.['seed-ratio-limit'] || 2.0
  // 是否启用下载队列限制
  sessionForm.value['download-queue-enabled'] = !!session.value?.['download-queue-enabled']
  // 最大同时下载任务数
  sessionForm.value['download-queue-size'] = session.value?.['download-queue-size'] || 3
  // 是否启用做种(上传)队列限制
  sessionForm.value['seed-queue-enabled'] = !!session.value?.['seed-queue-enabled']
  // 最大同时做种任务数
  sessionForm.value['seed-queue-size'] = session.value?.['seed-queue-size'] || 50

  // 其他设置
  sessionForm.value['script-torrent-done-filename'] = session.value?.['script-torrent-done-filename'] || ''
  sessionForm.value['script-torrent-done-enabled'] = !!session.value?.['script-torrent-done-enabled']
  sessionForm.value['single-line'] = !!settingStore.setting.singleLine
  sessionForm.value['dir-menu-mode'] = settingStore.setting.dirMenuMode || 'list'
  sessionForm.value['enable-download-dir-suggestions'] =
    settingStore.setting.enableDownloadDirSuggestions !== false
  sessionForm.value['custom-download-dirs'] = [...(settingStore.setting.customDownloadDirs || [])]
  sessionForm.value['default-trackers'] =
    session.value?.['default-trackers'] || settingStore.setting.defaultTrackers.join('\n')
}

onMounted(() => {
  sessionLoading.value = true
  sessionStore
    .fetchSession()
    .then(() => {
      formInit()
    })
    .finally(() => {
      sessionLoading.value = false
    })
})
// 保存设置
async function onSave() {
  loading.value = true
  try {
    if (pollingForm.value) {
      settingStore.setPolling(pollingForm.value)
    }
    settingStore.setting.singleLine = !!sessionForm.value['single-line']
    const dirMenuMode = sessionForm.value['dir-menu-mode']
    if (dirMenuMode === 'tree' || dirMenuMode === 'list') {
      settingStore.setting.dirMenuMode = dirMenuMode
    }
    settingStore.setting.enableDownloadDirSuggestions =
      sessionForm.value['enable-download-dir-suggestions'] !== false
    const rawCustomDirs = sessionForm.value['custom-download-dirs']
    const customDirs = Array.isArray(rawCustomDirs)
      ? Array.from(
          new Set(
            rawCustomDirs
              .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
              .filter((item: string) => Boolean(item))
          )
        )
      : []
    settingStore.setting.customDownloadDirs = customDirs
    await rpc.sessionSet(
      omit(sessionForm.value, [
        'single-line',
        'dir-menu-mode',
        'enable-download-dir-suggestions',
        'custom-download-dirs'
      ])
    )
    message.success($t('settings.saveSuccess'))
    emit('save-success')
  } catch {
    message.error($t('settings.saveFailed'))
  } finally {
    loading.value = false
  }
}

// 取消
function onCancel() {
  emit('cancel')
}
</script>

<style scoped lang="less">
.tabs {
  :deep(.n-tabs-nav) {
    padding-inline: 12px !important;
  }
}
.settings-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.settings-footer {
  position: sticky;
  bottom: 0;
  z-index: 10;
  background-color: var(--card-color);
  padding: 8px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  z-index: 1;
  gap: 12px;
  &:only-child {
    justify-content: flex-end;
  }
  justify-content: flex-end;
}
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .settings-footer {
    background-color: color-mix(in srgb, var(--base-color) 25%, transparent);
    -webkit-backdrop-filter: blur(30px);
    backdrop-filter: blur(30px);
  }
}
</style>
