<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('otherTorrentSetting.title')"
    :close-on-esc="true"
    style="padding: 12px; width: 90vw; max-width: 600px"
    @close="onCancel"
  >
    <div class="mb-2">{{ $t('otherTorrentSetting.selectedCount', { count: localSelectedKeys.length }) }}</div>
    <div class="item">
      <n-checkbox v-model:checked="formData.honorsSessionLimits">{{
        $t('otherTorrentSetting.useGlobalUploadLimit')
      }}</n-checkbox>
    </div>
    <div class="item" v-if="sessionStore?.rpcVersion >= 18">
      <n-checkbox v-model:checked="formData.sequential_download">{{
        $t('otherTorrentSetting.sequentialDownload')
      }}</n-checkbox>
    </div>

    <div class="item">
      <n-checkbox v-model:checked="formData.downloadLimited">{{
        $t('otherTorrentSetting.enableDownloadLimit')
      }}</n-checkbox>
      <div class="flex items-center gap-1">
        <n-input-number
          v-model:value="formData.downloadLimit"
          :min="0"
          :disabled="!formData.downloadLimited"
          :step="1024"
        /><span>KB/s</span>
      </div>
    </div>

    <div class="item">
      <n-checkbox v-model:checked="formData.uploadLimited">{{
        $t('otherTorrentSetting.enableUploadLimit')
      }}</n-checkbox>
      <div class="flex items-center gap-1">
        <n-input-number
          v-model:value="formData.uploadLimit"
          :min="0"
          :disabled="!formData.uploadLimited"
          :step="1024"
        /><span>KB/s</span>
      </div>
    </div>
    <div class="item">
      <div>{{ $t('otherTorrentSetting.maxConnections') }}</div>
      <n-input-number v-model:value="formData['peer-limit']" :min="0" class="mr-[32px]" />
    </div>
    <div class="item">
      <div>{{ $t('otherTorrentSetting.autoStopSeeding') }}</div>
      <div class="flex items-center gap-1">
        <n-select
          v-model:value="formData.seedRatioMode"
          :options="modeOptions"
          class="w-[130px]"
          :consistent-menu-width="false"
        />
        <n-input-number
          v-model:value="formData.seedRatioLimit"
          class="mr-[32px]"
          :disabled="formData.seedRatioMode !== 1"
        />
      </div>
    </div>
    <div class="item">
      <div>{{ $t('otherTorrentSetting.autoStopIdle') }}</div>
      <div class="flex items-center gap-1">
        <n-select
          v-model:value="formData.seedIdleMode"
          :options="modeOptions"
          class="w-[130px]"
          :consistent-menu-width="false"
        />
        <n-input-number v-model:value="formData.seedIdleLimit" :disabled="formData.seedIdleMode !== 1" />
        <span class="text-nowrap">{{ $t('common.minutes') }}</span>
      </div>
    </div>
    <template #action>
      <n-button @click="onCancel" :loading="loading">{{ $t('common.cancel') }}</n-button>
      <n-button type="primary" @click="onConfirm" :loading="loading">{{ $t('common.confirm') }}</n-button>
    </template>
  </n-modal>
</template>
<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { useTorrentStore, useSessionStore } from '@/store'
import { rpc } from '@/api/rpc'
import { useI18n } from 'vue-i18n'
import { getSelectIds } from './utils'

const show = defineModel<boolean>('show', { required: true })
const message = useMessage()
const torrentStore = useTorrentStore()
const sessionStore = useSessionStore()
const { t: $t } = useI18n()
const loading = ref(false)
const localSelectedKeys = ref<number[]>([])
const props = defineProps<{
  ids?: number[]
}>()
const formData = reactive({
  // 使用全局上传限制
  honorsSessionLimits: false,
  // 做种不活动时间限制 (分钟)
  seedIdleLimit: 30,
  // 使用哪种做种不活动模式。Use global (0), torrent (1), or unlimited (2) limit.
  seedIdleMode: 0,
  // 种子级别的分享率
  seedRatioLimit: 0,
  // 使用哪种分享率模式。Use global (0), torrent (1), or unlimited (2) limit.
  seedRatioMode: 0,
  // 按顺序下载
  sequential_download: false,
  // 启用最大下载速度限制
  downloadLimited: false,
  // 最大下载速度限制  (KBps)
  downloadLimit: 0,
  // 启用最大上传速度限制
  uploadLimited: false,
  // 最大上传速度限制  (KBps)
  uploadLimit: 0,
  // 最大连接数
  'peer-limit': 0
})

const modeOptions = computed(() => [
  { label: $t('otherTorrentSetting.global'), value: 0 },
  { label: $t('otherTorrentSetting.torrent'), value: 1 },
  { label: $t('otherTorrentSetting.unlimited'), value: 2 }
])

watch(show, (v) => {
  if (v) {
    const ids = getSelectIds(props.ids, torrentStore.selectedKeys)
    localSelectedKeys.value = ids
    const firstTorrent = torrentStore.torrents.find((t) => ids.includes(t.id))
    formData.honorsSessionLimits = firstTorrent?.honorsSessionLimits || false
    formData.seedIdleLimit = firstTorrent?.seedIdleLimit || 30
    formData.seedIdleMode = firstTorrent?.seedIdleMode || 0
    formData.seedRatioLimit = firstTorrent?.seedRatioLimit || 2.0
    formData.seedRatioMode = firstTorrent?.seedRatioMode || 0
    formData.sequential_download = firstTorrent?.sequential_download || false
    formData.downloadLimited = firstTorrent?.downloadLimited || false
    formData.downloadLimit = firstTorrent?.downloadLimit || 0
    formData.uploadLimited = firstTorrent?.uploadLimited || false
    formData.uploadLimit = firstTorrent?.uploadLimit || 0
    formData['peer-limit'] = firstTorrent?.['peer-limit'] || 50
  } else {
    localSelectedKeys.value = []
  }
})

async function onConfirm() {
  const ids = localSelectedKeys.value.length ? localSelectedKeys.value : getSelectIds(props.ids, torrentStore.selectedKeys)
  if (ids.length === 0) {
    message.warning($t('messages.pleaseSelectTask'))
    return
  }
  loading.value = true
  try {
    await rpc.torrentSet({ ids, ...formData })
    show.value = false
    message.success($t('otherTorrentSetting.modifySuccess'))
    await torrentStore.fetchTorrents(true)
  } catch {
    message.error($t('otherTorrentSetting.modifyFailed'))
  } finally {
    loading.value = false
  }
}
function onCancel() {
  show.value = false
}
</script>
<style scoped lang="less">
.item {
  flex-wrap: wrap;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 1rem;
}
</style>
