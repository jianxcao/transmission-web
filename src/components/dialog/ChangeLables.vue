<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('changeLabelsDialog.title')"
    :close-on-esc="true"
    @close="onCancel"
    style="padding: 12px; width: 90vw; max-width: 600px"
  >
    <div class="mb-2">{{ $t('changeLabelsDialog.selectedCount', { count: localSelectedKeys.length }) }}</div>
    <n-form :label-placement="labelType" :label-width="labelType === 'top' ? undefined : 120">
      <n-form-item :label="$t('changeLabelsDialog.labels')">
        <n-select
          v-model:value="labels"
          :options="labelsOptions"
          :placeholder="$t('changeLabelsDialog.labelsPlaceholder')"
          multiple
          clearable
          filterable
          tag
          style="width: 300px"
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
import { useTorrentStore } from '@/store'
import { rpc } from '@/api/rpc'
import { useI18n } from 'vue-i18n'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { getSelectIds } from './utils'
const isMobile = useIsSmallScreen()
const labelType = computed(() => (isMobile.value ? 'top' : 'left'))
const show = defineModel<boolean>('show', { required: true })
const message = useMessage()
const torrentStore = useTorrentStore()
const { t: $t } = useI18n()
const loading = ref(false)
const labels = ref<string[]>([])
const localSelectedKeys = ref<number[]>([])
const props = defineProps<{
  ids?: number[]
}>()
const labelsOptions = computed(() =>
  torrentStore.labelsOptions
    .filter((item: any) => item.key !== 'all' && item.key !== 'noLabels')
    .map((item: any) => ({
      label: typeof item.label === 'string' ? item.label.replace(/（.*?）/, '') : item.key,
      value: item.key
    }))
)
watch(
  () => show.value,
  (v) => {
    if (v) {
      // 默认目录为 sessionStore.session?.['download-dir'] 或第一个选中种子的 downloadDir
      localSelectedKeys.value = getSelectIds(props.ids, torrentStore.selectedKeys)
      const firstTorrent = torrentStore.torrents.find((t) => localSelectedKeys.value.includes(t.id))
      labels.value = firstTorrent?.labels || []
    } else {
      localSelectedKeys.value = []
    }
  }
)
async function onConfirm() {
  loading.value = true
  try {
    await rpc.torrentSet({
      ids: localSelectedKeys.value,
      labels: labels.value || []
    })
    show.value = false
    message.success($t('changeLabelsDialog.changeSuccess'))
    await torrentStore.fetchTorrents()
  } catch {
    message.error($t('changeLabelsDialog.changeFailed'))
  } finally {
    loading.value = false
  }
}
function onCancel() {
  show.value = false
}
</script>
<style scoped lang="less">
.mb-2 {
  margin-bottom: 0.5rem;
}
</style>
