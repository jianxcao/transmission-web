<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('addDialog.title')"
    :close-on-esc="true"
    @close="onCancel"
    style="width: 90vw; max-width: 600px; padding: 12px"
  >
    <n-el class="add-dialog-content">
      <n-form :model="form" :label-placement="labelType" :label-width="labelType === 'top' ? undefined : 120">
        <n-form-item :label="$t('addDialog.torrentFile')" required v-if="props.type === 'file'">
          <div class="add-dialog-upload">
            <n-upload
              v-model:file-list="uploadFileList"
              :default-upload="false"
              accept=".torrent"
              multiple
              @change="onFileChange"
            >
              <n-button>{{ $t('addDialog.selectFile') }}</n-button>
            </n-upload>
            <div v-if="selectedTorrentFiles.length" class="add-dialog-upload__summary">
              {{ $t('addDialog.selectedFiles', { count: selectedTorrentFiles.length }) }}
            </div>
          </div>
        </n-form-item>
        <n-form-item :label="$t('addDialog.magnetLink')" v-else>
          <n-input
            v-model:value="magnetLink"
            type="textarea"
            :placeholder="$t('addDialog.magnetPlaceholder')"
            :autosize="{
              minRows: 10
            }"
          />
        </n-form-item>

        <n-form-item :label="$t('addDialog.downloadDir')">
          <n-auto-complete
            v-model:value="form['download-dir']"
            :options="downloadDirOptions"
            :placeholder="$t('addDialog.downloadDirPlaceholder')"
            clearable
            :get-show="() => true"
          />
        </n-form-item>
        <n-form-item :label="$t('addDialog.labels')">
          <n-select
            v-model:value="form.labels"
            :options="labelsOptions"
            :placeholder="$t('addDialog.labelsPlaceholder')"
            multiple
            clearable
            filterable
            tag
          />
        </n-form-item>
        <n-form-item :label="$t('addDialog.startDirectly')">
          <n-switch v-model:value="form.paused" />
        </n-form-item>

        <n-form-item :label="$t('common.priority')">
          <n-select
            v-model:value="form.bandwidthPriority"
            :options="bandwidthPriorityOptions"
            :placeholder="$t('common.priority')"
          />
        </n-form-item>
        <n-form-item :label="$t('addDialog.sequentialDownload')" v-if="rpcVersion >= 18">
          <n-switch v-model:value="form.sequential_download" />
        </n-form-item>
      </n-form>
    </n-el>
    <template #action>
      <n-button @click="onCancel" :loading="loading">{{ $t('common.cancel') }}</n-button>
      <n-button type="primary" @click="onConfirm" :loading="loading" :disabled="confirmDisabled">{{
        $t('common.add')
      }}</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import type { TorrentAddArgs } from '@/api/rpc'
import { trpc } from '@/api/trpc'
import { useSessionStore, useTorrentStore } from '@/store'
import { sleep } from '@/utils'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { useDownloadDirOptions } from '@/composables/useDownloadDirOptions'
import type { UploadFileInfo } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
const isMobile = useIsSmallScreen()
const labelType = computed(() => (isMobile.value ? 'top' : 'left'))
const torrentStore = useTorrentStore()
const sessionStore = useSessionStore()
const { t: $t } = useI18n()
const rpcVersion = computed(() => sessionStore.rpcVersion)
const props = defineProps<{
  type: 'file' | 'magnet'
}>()
const show = defineModel<boolean>('show', { required: true })
const message = useMessage()
const loading = ref(false)
const magnetLink = ref('')
const uploadFileList = ref<UploadFileInfo[]>([])
const selectedTorrentFiles = ref<
  Array<{
    id: string
    name: string
    metainfo: string
  }>
>([])
const form = reactive<TorrentAddArgs>({
  'download-dir': '',
  labels: [],
  metainfo: '',
  paused: true,
  bandwidthPriority: undefined,
  sequential_download: false
})

const bandwidthPriorityOptions = computed(() => [
  { label: $t('priority.low'), value: -1 },
  { label: $t('priority.normal'), value: 0 },
  { label: $t('priority.high'), value: 1 }
])
const magnetLinks = computed(() =>
  magnetLink.value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
)
const confirmDisabled = computed(() =>
  props.type === 'file' ? selectedTorrentFiles.value.length === 0 : magnetLinks.value.length === 0
)

const { downloadDirOptions } = useDownloadDirOptions()
const labelsOptions = computed(() =>
  torrentStore.labelsOptions
    .filter((item: any) => item.key !== 'all' && item.key !== 'noLabels')
    .map((item: any) => ({
      label: item.label.replace(/（.*?）/, ''),
      value: item.key
    }))
)

async function onFileChange(data: { fileList: UploadFileInfo[] }) {
  const parsedFiles = await Promise.all(
    data.fileList.map(async (uploadFile) => {
      const rawFile = uploadFile.file as File | undefined
      if (!rawFile) {
        return null
      }
      try {
        return {
          id: uploadFile.id,
          name: uploadFile.name,
          metainfo: await readLocalTorrent(rawFile)
        }
      } catch {
        return null
      }
    })
  )
  const validFiles = parsedFiles.filter((item): item is (typeof selectedTorrentFiles.value)[number] => item !== null)
  selectedTorrentFiles.value = validFiles
  const validIds = new Set(validFiles.map((item) => item.id))
  uploadFileList.value = data.fileList.filter((item) => validIds.has(item.id))
  form.metainfo = validFiles[0]?.metainfo ?? ''

  const failedCount = data.fileList.length - validFiles.length
  if (failedCount > 0) {
    message.error(
      failedCount === 1 ? $t('addDialog.readFileFailed') : $t('addDialog.readFileFailedCount', { count: failedCount })
    )
  }
}

async function readLocalTorrent(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => {
      reject(new Error('Error reading file'))
    }
    reader.onloadend = () => {
      const b64 = (reader.result as string).match(/data:[^/]*\/[^;]*;base64,(.*)/)?.[1]
      if (b64 === undefined) {
        reject(new Error('Error reading file'))
        return
      }
      resolve(b64)
    }
    reader.readAsDataURL(file)
  })
}

function onCancel() {
  show.value = false
}

async function addTask(metainfo: string, filename?: string): Promise<'added' | 'duplicate' | 'failed'> {
  try {
    const res = await trpc.torrentAdd({
      'download-dir': form['download-dir']?.trim(),
      filename: filename,
      labels: form.labels,
      metainfo: metainfo,
      paused: !form.paused,
      bandwidthPriority: form.bandwidthPriority,
      sequential_download: form.sequential_download
    })
    console.debug('添加种子', res)
    if (res.arguments['torrent-duplicate']) {
      return 'duplicate'
    }
    return 'added'
  } catch {
    return 'failed'
  }
}

function showAddMessage(total: number, added: number, duplicate: number, failed: number) {
  if (total === 1) {
    if (added === 1) {
      message.success($t('addDialog.addSuccess'))
      return
    }
    if (duplicate === 1) {
      message.warning($t('addDialog.torrentExists'))
      return
    }
    message.error($t('addDialog.addFailed'))
    return
  }

  if (duplicate === 0 && failed === 0) {
    message.success($t('addDialog.batchAddSuccess', { count: added }))
    return
  }

  message.info(
    $t('addDialog.batchAddResult', {
      success: added,
      duplicate,
      failed
    })
  )
}

async function onConfirm() {
  if (props.type === 'file') {
    if (selectedTorrentFiles.value.length === 0) {
      message.error($t('addDialog.pleaseSelectFiles'))
      return
    }
    if (!form['download-dir']) {
      message.error($t('addDialog.pleaseSelectDir'))
      return
    }
    try {
      loading.value = true
      const total = selectedTorrentFiles.value.length
      const failedFiles: typeof selectedTorrentFiles.value = []
      let added = 0
      let duplicate = 0

      for (const torrentFile of selectedTorrentFiles.value) {
        const result = await addTask(torrentFile.metainfo)
        if (result === 'added') {
          added += 1
        } else if (result === 'duplicate') {
          duplicate += 1
        } else {
          failedFiles.push(torrentFile)
        }
      }

      if (added > 0) {
        await sleep(1000)
        await torrentStore.fetchTorrents()
      }

      const failed = failedFiles.length
      showAddMessage(total, added, duplicate, failed)

      if (failed === 0) {
        show.value = false
      } else {
        const failedIds = new Set(failedFiles.map((item) => item.id))
        selectedTorrentFiles.value = failedFiles
        uploadFileList.value = uploadFileList.value.filter((item) => failedIds.has(item.id))
        form.metainfo = failedFiles[0]?.metainfo ?? ''
      }
    } catch {
    } finally {
      loading.value = false
    }
  } else {
    if (!magnetLink.value) {
      message.error($t('addDialog.pleaseInputMagnet'))
      return
    }
    try {
      loading.value = true
      const total = magnetLinks.value.length
      const failedMagnets: string[] = []
      let added = 0
      let duplicate = 0

      for (const item of magnetLinks.value) {
        const result = await addTask('', item)
        if (result === 'added') {
          added += 1
        } else if (result === 'duplicate') {
          duplicate += 1
        } else {
          failedMagnets.push(item)
        }
      }

      if (added > 0) {
        await sleep(1000)
        await torrentStore.fetchTorrents()
      }

      const failed = failedMagnets.length
      showAddMessage(total, added, duplicate, failed)

      if (failed === 0) {
        show.value = false
      } else {
        magnetLink.value = failedMagnets.join('\n')
      }
    } catch (error) {
      console.error(error)
    } finally {
      loading.value = false
    }
  }
}

watch(show, (v) => {
  if (v) {
    const dir = sessionStore.session?.['download-dir']
    Object.assign(form, {
      'download-dir': dir,
      labels: [],
      metainfo: '',
      paused: true,
      bandwidthPriority: undefined,
      sequential_download: false
    })
    magnetLink.value = ''
    uploadFileList.value = []
    selectedTorrentFiles.value = []
  }
})
</script>

<style lang="less" scoped>
@import '@/styles/mix.less';
.add-dialog-content {
  max-height: calc(100vh - 200px);
  overflow: auto;
  .scrollbar();
}

.add-dialog-upload {
  width: 100%;

  &__summary {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-color-3);
  }
}
</style>
