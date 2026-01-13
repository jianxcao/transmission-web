<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('renameTorrentDialog.title')"
    :close-on-esc="true"
    @close="onCancel"
    style="padding: 12px; width: 90vw; max-width: 600px"
  >
    <div class="mb-2">{{ $t('renameTorrentDialog.selectedCount', { count: localSelectedKeys.length }) }}</div>
    <n-form :label-placement="labelType" :label-width="labelType === 'top' ? undefined : 120" :show-feedback="false">
      <n-form-item :label="$t('renameTorrentDialog.newName')">
        <n-input
          v-model:value="newName"
          :placeholder="$t('renameTorrentDialog.newNamePlaceholder')"
          clearable
          @keyup.enter="onConfirm"
        />
      </n-form-item>
      <n-form-item v-if="localSelectedKeys.length === 1">
        <n-text class="text-xs text-gray-500">{{ $t('renameTorrentDialog.currentName') }}: {{ currentName }}</n-text>
      </n-form-item>
    </n-form>
    <template #action>
      <n-button @click="onCancel" :loading="loading">{{ $t('common.cancel') }}</n-button>
      <n-button type="primary" @click="onConfirm" :loading="loading"> {{ $t('common.confirm') }} </n-button>
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
import { fileSystemSafeName } from '@/utils/index'

const isMobile = useIsSmallScreen()
const labelType = computed(() => (isMobile.value ? 'top' : 'left'))
const show = defineModel<boolean>('show', { required: true })
const message = useMessage()
const torrentStore = useTorrentStore()
const { t: $t } = useI18n()
const loading = ref(false)
const newName = ref('')
const props = defineProps<{
  ids?: number[]
}>()
const localSelectedKeys = ref<number[]>([])

const currentName = computed(() => {
  if (localSelectedKeys.value.length === 1) {
    const torrent = torrentStore.torrents.find((t) => t.id === localSelectedKeys.value[0])
    return torrent?.name || ''
  }
  return ''
})

watch(
  () => show.value,
  (v) => {
    if (v) {
      localSelectedKeys.value = getSelectIds(props.ids, torrentStore.selectedKeys)
      // 如果只选中一个，默认填充当前名称
      if (localSelectedKeys.value.length === 1) {
        const torrent = torrentStore.torrents.find((t) => t.id === localSelectedKeys.value[0])
        newName.value = torrent?.name || ''
      } else {
        newName.value = ''
      }
    } else {
      localSelectedKeys.value = []
      newName.value = ''
    }
  }
)

async function onConfirm() {
  if (!newName.value.trim()) {
    message.error($t('renameTorrentDialog.pleaseInputName'))
    return
  }

  // 验证名称是否包含非法字符
  const safeName = fileSystemSafeName(newName.value.trim())
  if (safeName !== newName.value.trim()) {
    message.warning($t('renameTorrentDialog.invalidChars'))
    newName.value = safeName
    return
  }

  loading.value = true
  try {
    // 对于每个选中的 torrent，重命名其根文件夹
    // torrent-rename-path 的 path 参数应该是 torrent 的当前名称（根文件夹名）
    for (const id of localSelectedKeys.value) {
      const torrent = torrentStore.torrents.find((t) => t.id === id)
      if (!torrent) {
        continue
      }
      // path 参数使用 torrent 的当前名称，表示要重命名根文件夹
      await rpc.torrentRenamePath(id, torrent.name, newName.value.trim())
    }
    show.value = false
    message.success($t('renameTorrentDialog.renameSuccess'))
    await torrentStore.fetchTorrents()
  } catch (error) {
    console.error('重命名失败:', error)
    message.error($t('renameTorrentDialog.renameFailed'))
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
