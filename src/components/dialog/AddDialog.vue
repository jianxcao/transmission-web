<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('addDialog.title')"
    :close-on-esc="true"
    @close="onCancel"
    style="width: 90vw; max-width: 800px; padding: 12px"
  >
    <n-el class="add-dialog-content">
      <n-form :model="form" :label-placement="labelType" :label-width="labelType === 'top' ? undefined : 120">
        <n-form-item :label="$t('addDialog.torrentFile')" required v-if="props.type === 'file'">
          <n-upload :max="50" multiple accept=".torrent" @change="onFileChange">
            <n-button>{{ $t('addDialog.selectFile') }}</n-button>
          </n-upload>
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

        <!-- 种子内容显示区域 -->
        <n-form-item :label="$t('addDialog.torrentContent')" v-if="props.type === 'file' && torrentInfo">
          <div class="torrent-content">
            <div class="torrent-info-header">
              <div class="info-item">
                <span class="label">{{ torrentInfo.name }}</span>
              </div>
              <div class="info-stats">
                <span class="stat-item">{{ $t('addDialog.totalFiles', { count: torrentInfo.files.length }) }}</span>
                <span class="stat-item">{{ $t('addDialog.totalSize', { size: formatSize(torrentInfo.totalSize) }) }}</span>
              </div>
            </div>

            <!-- 文件选择统计 -->
            <div class="selection-stats">
              <span>{{ $t('addDialog.selectedFiles', { count: selectedFileCount }) }}</span>
              <span class="stat-item">{{ $t('addDialog.selectedSize', { size: formatSize(selectedFileSize) }) }}</span>
            </div>

            <!-- 操作按钮 -->
            <div class="file-actions">
              <n-button size="small" @click="selectAllFiles">{{ $t('addDialog.selectAll') }}</n-button>
              <n-button size="small" @click="deselectAllFiles">{{ $t('addDialog.deselectAll') }}</n-button>
            </div>

            <!-- 文件列表 -->
            <div class="file-list">
              <n-scrollbar style="max-height: 300px">
                <div
                  v-for="(file, index) in torrentInfo.files"
                  :key="index"
                  class="file-item"
                  :class="{ selected: selectedFiles.has(index) }"
                  @click="toggleFileSelection(index)"
                >
                  <n-checkbox
                    :checked="selectedFiles.has(index)"
                    @update:checked="toggleFileSelection(index)"
                    @click.stop
                  />
                  <div class="file-info">
                    <span class="file-name" :title="file.path">{{ file.path }}</span>
                    <span class="file-size">{{ formatSize(file.length) }}</span>
                  </div>
                </div>
              </n-scrollbar>
            </div>
          </div>
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
      <div class="flex gap-2 w-full justify-end">
        <n-button @click="onCancel" :loading="loading">{{ $t('common.cancel') }}</n-button>
        <n-button type="primary" @click="onConfirm" :loading="loading" :disabled="!canAdd">{{
          $t('common.add')
        }}</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import type { TorrentAddArgs } from '@/api/rpc'
import { trpc } from '@/api/trpc'
import { useSessionStore, useTorrentStore } from '@/store'
import { sleep, formatSize } from '@/utils'
import { parseTorrentFromBase64, type TorrentInfo } from '@/utils/torrentParser'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
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
const form = reactive<TorrentAddArgs>({
  'download-dir': '',
  labels: [],
  metainfo: '',
  paused: true,
  bandwidthPriority: undefined,
  sequential_download: false
})

// 种子信息
const torrentInfo = ref<TorrentInfo | null>(null)
// 选中的文件索引
const selectedFiles = ref<Set<number>>(new Set())

// 计算选中的文件数量
const selectedFileCount = computed(() => selectedFiles.value.size)

// 计算选中的文件大小
const selectedFileSize = computed(() => {
  if (!torrentInfo.value) return 0
  let size = 0
  selectedFiles.value.forEach((index) => {
    const file = torrentInfo.value?.files[index]
    if (file) {
      size += file.length
    }
  })
  return size
})

// 判断添加按钮是否可用
const canAdd = computed(() => {
  if (props.type === 'file') {
    // 文件模式：需要选择了文件且选择了下载目录
    return metainfoList.value.length > 0 && form['download-dir']
  } else {
    // 磁力链接模式：需要输入了磁力链接
    return magnetLink.value.trim().length > 0
  }
})

// 多文件上传的 metainfo 列表
const metainfoList = ref<string[]>([])

const bandwidthPriorityOptions = computed(() => [
  { label: $t('priority.low'), value: -1 },
  { label: $t('priority.normal'), value: 0 },
  { label: $t('priority.high'), value: 1 }
])

// 展平树形目录结构为一维数组
const flattenDirOptions = (items: any[]): any[] => {
  const result: any[] = []
  items.forEach((item) => {
    if (item.key !== 'all') {
      result.push({
        label: item.key, // 使用完整路径作为显示标签
        value: item.key
      })
      if (item.children && item.children.length > 0) {
        result.push(...flattenDirOptions(item.children))
      }
    }
  })
  return result
}

const downloadDirOptions = computed(() =>
  flattenDirOptions(torrentStore.downloadDirOptions)
)
const labelsOptions = computed(() =>
  torrentStore.labelsOptions
    .filter((item: any) => item.key !== 'all' && item.key !== 'noLabels')
    .map((item: any) => ({
      label: typeof item.label === 'string' ? item.label.replace(/（.*?）/, '') : item.key,
      value: item.key
    }))
)

async function onFileChange(data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) {
  // 支持多文件上传
  const files = data.fileList.map((f) => f.file).filter((f): f is File => f !== undefined)
  if (files.length === 0) {
    metainfoList.value = []
    torrentInfo.value = null
    selectedFiles.value.clear()
    return
  }
  try {
    metainfoList.value = await Promise.all(files.map((f) => readLocalTorrent(f)))

    // 如果只有一个文件，解析并显示文件列表
    if (metainfoList.value.length === 1) {
      try {
        torrentInfo.value = parseTorrentFromBase64(metainfoList.value[0])
        // 默认全选所有文件
        selectedFiles.value = new Set(torrentInfo.value.files.map((_, index) => index))
      } catch (error) {
        console.error('解析种子文件失败', error)
        message.error($t('addDialog.parseFailed'))
        torrentInfo.value = null
        selectedFiles.value.clear()
      }
    } else {
      // 多文件模式，不显示文件列表
      torrentInfo.value = null
      selectedFiles.value.clear()
    }
  } catch {
    message.error($t('addDialog.readFileFailed'))
    metainfoList.value = []
    torrentInfo.value = null
    selectedFiles.value.clear()
  }
}

async function readLocalTorrent(file: File): Promise<string> {
  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const b64 = (reader.result as string).match(/data:[^/]*\/[^;]*;base64,(.*)/)?.[1]
      if (b64 === undefined) {
        throw Error('Error reading file')
      }
      resolve(b64)
    }
    reader.readAsDataURL(file)
  })
}

// 切换文件选择
function toggleFileSelection(index: number) {
  if (selectedFiles.value.has(index)) {
    selectedFiles.value.delete(index)
  } else {
    selectedFiles.value.add(index)
  }
  // 触发响应式更新
  selectedFiles.value = new Set(selectedFiles.value)
}

// 全选
function selectAllFiles() {
  if (torrentInfo.value) {
    selectedFiles.value = new Set(torrentInfo.value.files.map((_, index) => index))
  }
}

// 取消全选
function deselectAllFiles() {
  selectedFiles.value.clear()
  selectedFiles.value = new Set()
}

function onCancel() {
  show.value = false
}

async function addTask(metainfo: string, filename?: string, fileIndices?: number[]) {
  try {
    const args: TorrentAddArgs = {
      'download-dir': form['download-dir']?.trim(),
      filename: filename,
      labels: form.labels,
      metainfo: metainfo,
      paused: !form.paused,
      bandwidthPriority: form.bandwidthPriority,
      sequential_download: form.sequential_download
    }

    // 如果有文件选择，添加文件选择参数
    if (fileIndices && fileIndices.length > 0 && torrentInfo.value) {
      // 如果不是全选，设置需要下载的文件
      if (fileIndices.length < torrentInfo.value.files.length) {
        args['files-wanted'] = fileIndices
      }
    }

    const res = await trpc.torrentAdd(args)
    console.debug('添加种子', res)
    if (res.arguments['torrent-duplicate']) {
      return { success: false, duplicate: true }
    }
    return { success: true }
  } catch (error) {
    console.error('添加种子失败', error)
    return { success: false, error }
  }
}

async function onConfirm() {
  if (props.type === 'file') {
    if (!metainfoList.value || metainfoList.value.length === 0) {
      message.error($t('addDialog.pleaseSelectFile'))
      return
    }
    if (!form['download-dir']) {
      message.error($t('addDialog.pleaseSelectDir'))
      return
    }
    try {
      loading.value = true
      const results = await Promise.all(
        metainfoList.value.map(async (metainfo, index) => {
          // 如果是第一个文件且有文件选择，传递文件索引
          const fileIndices = index === 0 && selectedFiles.value.size > 0 ? Array.from(selectedFiles.value) : undefined
          return await addTask(metainfo, undefined, fileIndices)
        })
      )
      // 检查是否全部重复
      const allDuplicate = results.every((r) => r.duplicate)
      if (allDuplicate) {
        message.warning($t('addDialog.torrentExists'))
      } else {
        message.success($t('addDialog.addSuccess'))
        await sleep(1000)
        await torrentStore.fetchTorrents()
      }
      show.value = false
    } catch {
    } finally {
      loading.value = false
    }
  } else {
    if (!magnetLink.value) {
      message.error($t('addDialog.pleaseInputMagnet'))
      return
    }
    // 解析磁力链接
    const magnetLinks = magnetLink.value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
    try {
      loading.value = true
      const results = await Promise.all(
        magnetLinks.map(async (magnet) => {
          return await addTask('', magnet)
        })
      )
      const allDuplicate = results.every((r) => r.duplicate)
      if (allDuplicate) {
        message.warning($t('addDialog.torrentExists'))
      } else {
        message.success($t('addDialog.addSuccess'))
        await sleep(1000)
        await torrentStore.fetchTorrents()
      }
      show.value = false
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
    metainfoList.value = []
    magnetLink.value = ''
    torrentInfo.value = null
    selectedFiles.value.clear()
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

.torrent-content {
  width: 100%;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.torrent-info-header {
  padding: 12px;
  background: var(--n-color-modal);
  border-bottom: 1px solid var(--n-border-color);

  .info-item {
    margin-bottom: 8px;

    .label {
      font-weight: 500;
      word-break: break-all;
    }
  }

  .info-stats {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--n-text-color-3);
  }
}

.selection-stats {
  padding: 8px 12px;
  background: var(--n-color-hover);
  font-size: 12px;
  color: var(--n-text-color-2);
  display: flex;
  gap: 16px;
}

.file-actions {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--n-border-color);
}

.file-list {
  .file-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.2s;
    border-bottom: 1px solid var(--n-border-color);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--n-color-hover);
    }

    &.selected {
      background: var(--n-color-hover);
    }

    .file-info {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-left: 8px;
      min-width: 0;

      .file-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 12px;
      }

      .file-size {
        flex-shrink: 0;
        font-size: 12px;
        color: var(--n-text-color-3);
      }
    }
  }
}

.stat-item {
  white-space: nowrap;
}
</style>
