<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    :title="$t('replaceTracker.title')"
    :close-on-esc="true"
    style="padding: 12px; width: 90vw; max-width: 700px"
    @close="onCancel"
  >
    <div class="mb-4">
      {{ $t('replaceTracker.description') }}
    </div>

    <!-- 搜索 Tracker -->
    <n-form-item :label="$t('replaceTracker.searchTracker')">
      <n-auto-complete
        v-model:value="searchTracker"
        :options="trackerOptions"
        :placeholder="$t('replaceTracker.searchPlaceholder')"
        clearable
        blur-after-select
      />
    </n-form-item>

    <!-- 匹配的种子列表 -->
    <n-form-item v-if="searchTracker.trim()">
      <template #label>
        <div class="flex items-center gap-2">
          <span>{{ $t('replaceTracker.matchedTorrents') }}</span>
          <n-tag size="small" type="primary">{{ matchedTorrents.length }}</n-tag>
        </div>
      </template>

      <n-scrollbar v-if="matchedTorrents.length > 0" style="max-height: 180px">
        <n-list size="small" bordered>
          <n-list-item v-for="torrent in matchedTorrents" :key="torrent.id">
            <div class="flex items-center gap-2">
              <n-tag size="small" :type="getStatusType(torrent.status)">
                {{ getStatusText(torrent.status) }}
              </n-tag>
              <span class="truncate">{{ torrent.name }}</span>
            </div>
          </n-list-item>
        </n-list>
      </n-scrollbar>
      <n-empty v-else :description="$t('replaceTracker.noMatchedTorrents')" />
    </n-form-item>

    <!-- 替换为 -->
    <n-form-item v-if="matchedTorrents.length > 0" :label="$t('replaceTracker.replaceWith')">
      <n-auto-complete
        v-model:value="replaceTracker"
        :options="trackerOptions"
        :placeholder="$t('replaceTracker.replacePlaceholder')"
        clearable
        blur-after-select
      />
    </n-form-item>

    <template #action>
      <n-button @click="onCancel">{{ $t('common.cancel') }}</n-button>
      <n-button type="primary" :loading="loading" :disabled="!canSubmit" @click="onConfirm">
        {{ $t('replaceTracker.replaceButton', { count: matchedTorrents.length }) }}
      </n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { useTorrentStore } from '@/store'
import { rpc } from '@/api/rpc'
import { useI18n } from 'vue-i18n'
import { sleep } from '@/utils'
import type { Torrent } from '@/api/rpc'

const show = defineModel<boolean>('show', { required: true })
const message = useMessage()
const torrentStore = useTorrentStore()
const { t: $t } = useI18n()
const loading = ref(false)
const searchTracker = ref('')
const replaceTracker = ref('')

// 所有 Tracker 选项（用于自动完成）
const trackerOptions = computed(() => {
  const trackers = new Set<string>()
  torrentStore.torrents.forEach((t) => {
    t.trackerStats.forEach((ts) => {
      if (ts.announce) {
        trackers.add(ts.announce)
      }
    })
  })
  return Array.from(trackers)
    .sort()
    .map((t) => ({ label: t, value: t }))
})

// 匹配的种子列表
const matchedTorrents = computed(() => {
  const search = searchTracker.value.trim().toLowerCase()
  if (!search) return []

  return torrentStore.torrents.filter((t) => t.trackerStats.some((ts) => ts.announce?.toLowerCase().includes(search)))
})

// 是否可提交
const canSubmit = computed(() => {
  return (
    matchedTorrents.value.length > 0 &&
    replaceTracker.value.trim() &&
    replaceTracker.value.trim() !== searchTracker.value.trim()
  )
})

// 获取状态类型（用于标签颜色）
function getStatusType(status: number): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const statusMap: Record<number, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    0: 'default', // 已暂停
    1: 'info', // 等待检验
    2: 'info', // 检验中
    3: 'warning', // 等待下载
    4: 'success', // 下载中
    5: 'warning', // 等待做种
    6: 'success' // 做种中
  }
  return statusMap[status] || 'default'
}

// 获取状态文本
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    0: $t('status.stopped'),
    1: $t('status.queuedToVerify'),
    2: $t('status.verifying'),
    3: $t('status.queuedToDownload'),
    4: $t('status.downloading'),
    5: $t('status.queuedToSeed'),
    6: $t('status.seeding')
  }
  return statusTexts[status] || String(status)
}

// 执行替换
async function onConfirm() {
  if (!canSubmit.value) return

  loading.value = true
  try {
    const search = searchTracker.value.trim().toLowerCase()
    const replace = replaceTracker.value.trim()
    let successCount = 0
    let failCount = 0

    for (const torrent of matchedTorrents.value) {
      try {
        // 获取当前 tracker 列表并执行替换
        const currentTrackers = torrent.trackerStats.map((ts) => ts.announce)
        const updatedTrackers = currentTrackers.map((tracker) =>
          tracker.toLowerCase().includes(search) ? replace : tracker
        )

        await rpc.torrentSet({
          ids: [torrent.id],
          trackerList: updatedTrackers.join('\n')
        })
        successCount++
      } catch {
        failCount++
        console.error(`Failed to replace tracker for torrent: ${torrent.name}`)
      }
    }

    // 刷新数据
    await sleep(500)
    await torrentStore.fetchTorrents()

    if (failCount === 0) {
      message.success($t('replaceTracker.replaceSuccess', { count: successCount }))
    } else {
      message.warning($t('replaceTracker.replacePartial', { success: successCount, fail: failCount }))
    }

    show.value = false
  } catch (error) {
    console.error(error)
    message.error($t('replaceTracker.replaceFailed'))
  } finally {
    loading.value = false
  }
}

function onCancel() {
  show.value = false
}

// 重置状态
watch(show, (newVal) => {
  if (!newVal) {
    searchTracker.value = ''
    replaceTracker.value = ''
  }
})
</script>
