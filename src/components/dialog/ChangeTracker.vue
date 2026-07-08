<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('changeTracker.title')"
    :close-on-esc="true"
    style="padding: 12px; width: 90vw; max-width: 600px"
    @close="onCancel"
  >
    <div class="mb-2">{{ $t('changeTracker.selectedCount', { count: localSelectedKeys.length }) }}</div>
    <div class="flex items-center justify-between flex-wrap">
      <div>{{ $t('changeTracker.trackerList') }}</div>
      <n-button type="primary" @click="onAddTracker">{{ $t('changeTracker.addDefaultTracker') }}</n-button>
    </div>
    <n-form label-placement="top" :label-width="120" :show-feedback="false">
      <n-form-item>
        <template #label> </template>
        <n-input
          v-model:value="tracker"
          :placeholder="$t('changeTracker.trackerPlaceholder')"
          type="textarea"
          :autosize="{ minRows: 5, maxRows: 10 }"
        />
      </n-form-item>
    </n-form>
    <template #action>
      <n-button @click="onCancel" :loading="loading">{{ $t('common.cancel') }}</n-button>
      <n-button type="primary" @click="onConfirm" :loading="loading">{{ $t('common.confirm') }}</n-button>
    </template>
  </n-modal>
</template>
<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { useSettingStore, useTorrentStore, useSessionStore } from '@/store'
import { rpc } from '@/api/rpc'
import { useI18n } from 'vue-i18n'
import { getSelectIds } from './utils'

const show = defineModel<boolean>('show', { required: true })
const message = useMessage()
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const sessionStore = useSessionStore()
const { t: $t } = useI18n()
const loading = ref(false)
const localSelectedKeys = ref<number[]>([])
const tracker = ref<string>('')

const props = defineProps<{
  ids?: number[]
}>()

watch(
  () => show.value,
  (v) => {
    if (v) {
      // 默认目录为 sessionStore.session?.['download-dir'] 或第一个选中种子的 downloadDir
      localSelectedKeys.value = getSelectIds(props.ids, torrentStore.selectedKeys)
      const firstTorrent = torrentStore.torrents.find((t) => localSelectedKeys.value.includes(t.id))
      tracker.value = firstTorrent?.trackerList || firstTorrent?.trackerStats.map((t) => t.announce).join('\n') || ''
      console.debug(localSelectedKeys.value)
    } else {
      localSelectedKeys.value = []
    }
  }
)
async function onConfirm() {
  loading.value = true
  const cleanTrackers = tracker.value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .join('\n')
  try {
    await rpc.torrentSet({ ids: localSelectedKeys.value, trackerList: cleanTrackers })
    show.value = false
    message.success($t('changeTracker.modifySuccess'))
    await torrentStore.fetchTorrents()
  } catch {
    message.error($t('changeTracker.modifyFailed'))
  } finally {
    loading.value = false
  }
}
function onCancel() {
  show.value = false
}
function onAddTracker() {
  let defaultTrackers = settingStore.setting.defaultTrackers
  if (sessionStore.session?.['default-trackers']) {
    defaultTrackers = sessionStore.session?.['default-trackers'].split('\n')
  }
  const trackerList = tracker.value.split('\n')
  if (defaultTrackers) {
    tracker.value = [...new Set([...trackerList, ...defaultTrackers])].join('\n')
  }
}
</script>
<style scoped lang="less">
.mb-2 {
  margin-bottom: 0.5rem;
}
</style>
