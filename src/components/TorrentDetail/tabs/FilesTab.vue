<template>
  <div class="files-tab">
    <div class="files-toolbar">
      <div class="files-summary">
        <n-text class="text-xs">
          {{ t('torrentDetail.files.fileCount') }}: {{ totalFiles }} |
          {{ t('torrentDetail.files.selectedDownload') }}: {{ selectedFiles }} |
          {{ t('torrentDetail.files.totalSize') }}: {{ formatSize(totalSize) }}
        </n-text>
      </div>
      <div class="files-controls">
        <n-input
          v-model:value="searchKeyword"
          size="small"
          clearable
          :placeholder="t('torrentDetail.files.searchPlaceholder')"
          class="files-search-input"
        >
          <template #prefix>
            <n-icon :component="SearchOutline" />
          </template>
        </n-input>
        <n-checkbox v-model:checked="onlyIncomplete" size="small">
          {{ t('torrentDetail.files.onlyIncomplete') }}
        </n-checkbox>
        <n-button size="small" @click="selectAll">{{ t('torrentDetail.files.selectAll') }}</n-button>
        <n-dropdown :options="priorityOptions" @select="handleBatchPriority" placement="bottom-end">
          <n-button size="small">{{ t('torrentDetail.files.batchSetPriority') }}</n-button>
        </n-dropdown>
      </div>
    </div>

    <div class="files-table-scroll">
      <div class="files-table-inner">
        <div class="files-table-header">
          <div class="col-name">{{ t('torrentDetail.files.name') }}</div>
          <div class="col-size">{{ t('torrentDetail.files.size') }}</div>
          <div class="col-progress">{{ t('torrentDetail.files.progress') }}</div>
          <div class="col-priority">{{ t('torrentDetail.files.priority') }}</div>
        </div>
        <div class="files-table-body">
          <n-tree
            v-if="filteredTreeData.length > 0"
            ref="treeRef"
            v-model:expanded-keys="expandedKeys"
            :data="filteredTreeData"
            :checked-keys="checkedKeys"
            :render-label="renderLabel"
            :render-prefix="renderPrefix"
            :render-suffix="renderSuffix"
            checkable
            cascade
            check-strategy="child"
            @update:checked-keys="onCheckedKeysChange"
            expand-on-click
            key-field="key"
            children-field="children"
            virtual-scroll
            style="height: 100%"
            class="file-tree"
          />
          <div v-else class="files-empty">
            <n-empty :description="t('torrentDetail.files.emptyFilter')" size="small" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Torrent } from '@/api/rpc'
import { rpc } from '@/api/rpc'
import { formatSize } from '@/utils'
import { getProgressPercent } from '@/utils/torrentProgress'
import { getPriorityString, type PriorityNumberType } from '@/types/tr'
import type { TreeOption } from 'naive-ui'
import { h, computed, ref, watch } from 'vue'
import { NProgress, NTag, NDropdown, NButton, useMessage, NText, NTree, NInput, NCheckbox, NIcon, NEmpty } from 'naive-ui'
import { FolderOutline, DocumentOutline, SearchOutline } from '@vicons/ionicons5'
import { priorityOptions, priorityTagColorConfig } from '@/components/AppHeader/priority'
import { useTorrentStore } from '@/store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface FileTreeNode extends TreeOption {
  key: string
  label: string
  fileIndex?: number
  isDirectory: boolean
  size: number
  completed: number
  progress: number
  isComplete: boolean
  priority: number
  wanted: boolean
  children?: FileTreeNode[]
  path: string
}

const props = defineProps<{ torrent: Torrent }>()
const message = useMessage()
const treeRef = ref()
const torrentStore = useTorrentStore()

const checkedKeys = ref<string[]>([])
const expandedKeys = ref<string[]>([])
const searchKeyword = ref('')
const onlyIncomplete = ref(false)

function collectDirectoryKeys(nodes: FileTreeNode[]): string[] {
  const keys: string[] = []
  const walk = (list: FileTreeNode[]) => {
    list.forEach((node) => {
      if (node.isDirectory) {
        keys.push(node.key)
        if (node.children) {
          walk(node.children)
        }
      }
    })
  }
  walk(nodes)
  return keys
}

function collectFileKeys(nodes: FileTreeNode[]): Set<string> {
  const keys = new Set<string>()
  const walk = (list: FileTreeNode[]) => {
    list.forEach((node) => {
      if (!node.isDirectory) {
        keys.add(node.key)
      } else if (node.children) {
        walk(node.children)
      }
    })
  }
  walk(nodes)
  return keys
}

// 构建完整文件树结构
const treeData = computed<FileTreeNode[]>(() => {
  if (!props.torrent.files || !props.torrent.fileStats) {
    return []
  }

  const files = props.torrent.files
  const fileStats = props.torrent.fileStats
  const root: FileTreeNode[] = []
  const pathMap = new Map<string, FileTreeNode>()

  files.forEach((file, index) => {
    const stat = fileStats[index]
    if (!stat) {
      return
    }

    const parts = file.name.split('/')
    let currentPath = ''
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLastPart = i === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      let existingNode = pathMap.get(currentPath)

      if (!existingNode) {
        const size = isLastPart ? file.length : 0
        const completed = isLastPart ? file.bytesCompleted : 0
        const isComplete = isLastPart ? file.bytesCompleted >= file.length : true
        const node: FileTreeNode = {
          key: currentPath,
          label: part,
          isDirectory: !isLastPart,
          size,
          completed,
          progress: isLastPart ? (size > 0 ? completed / size : 1) : 0,
          isComplete,
          priority: isLastPart ? stat.priority : 0,
          wanted: isLastPart ? stat.wanted : true,
          children: isLastPart ? undefined : [],
          path: currentPath,
          fileIndex: isLastPart ? index : undefined
        }

        pathMap.set(currentPath, node)
        currentLevel.push(node)
        existingNode = node
      }

      if (!isLastPart && existingNode.children) {
        currentLevel = existingNode.children
      }
    }
  })

  // 直接累加字节数，避免浮点反推带来的进度误差
  const updateDirectoryStats = (nodes: FileTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.isDirectory && node.children) {
        updateDirectoryStats(node.children)

        let totalSize = 0
        let totalCompleted = 0
        let hasWanted = false
        let allComplete = true

        node.children.forEach((child) => {
          totalSize += child.size
          totalCompleted += child.completed
          if (child.wanted) {
            hasWanted = true
          }
          if (!child.isComplete) {
            allComplete = false
          }
        })

        node.size = totalSize
        node.completed = totalCompleted
        node.progress = totalSize > 0 ? totalCompleted / totalSize : 1
        node.isComplete = allComplete && (totalSize === 0 || totalCompleted >= totalSize)
        node.wanted = hasWanted
      }
    })
  }

  updateDirectoryStats(root)
  return root
})

const isFiltering = computed(() => Boolean(searchKeyword.value.trim()) || onlyIncomplete.value)

// 按搜索关键词与完成状态过滤文件树
const filteredTreeData = computed<FileTreeNode[]>(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const filterIncomplete = onlyIncomplete.value

  if (!keyword && !filterIncomplete) {
    return treeData.value
  }

  const filterNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    const result: FileTreeNode[] = []
    for (const node of nodes) {
      if (node.isDirectory && node.children) {
        const filteredChildren = filterNodes(node.children)
        if (filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren
          })
        }
      } else {
        const matchesKeyword =
          !keyword || node.path.toLowerCase().includes(keyword) || node.label.toLowerCase().includes(keyword)
        const matchesIncomplete = !filterIncomplete || (!node.isComplete && node.wanted)
        if (matchesKeyword && matchesIncomplete) {
          result.push(node)
        }
      }
    }
    return result
  }

  return filterNodes(treeData.value)
})

let initializedTorrentId: number | null = null
let preFilterExpandedKeys: string[] | null = null
let knownFilteredDirectoryKeys = new Set<string>()

// 切换种子或首次加载完文件列表时默认展开全部目录
watch(
  [() => props.torrent.id, treeData],
  ([id, nodes]) => {
    if (nodes.length === 0) {
      initializedTorrentId = null
      preFilterExpandedKeys = null
      knownFilteredDirectoryKeys.clear()
      expandedKeys.value = []
      return
    }
    if (id !== initializedTorrentId) {
      initializedTorrentId = id
      preFilterExpandedKeys = null
      const keys = collectDirectoryKeys(isFiltering.value ? filteredTreeData.value : nodes)
      knownFilteredDirectoryKeys = isFiltering.value ? new Set(keys) : new Set()
      expandedKeys.value = keys
    }
  },
  { immediate: true }
)

// 搜索或筛选时自动展开命中目录，退出筛选时恢复筛选前展开状态
watch([searchKeyword, onlyIncomplete], ([,], [oldKeyword, oldOnlyIncomplete]) => {
  const wasFiltering = Boolean(oldKeyword?.trim()) || Boolean(oldOnlyIncomplete)
  if (isFiltering.value) {
    if (!wasFiltering && preFilterExpandedKeys === null) {
      preFilterExpandedKeys = [...expandedKeys.value]
    }
    const keys = collectDirectoryKeys(filteredTreeData.value)
    knownFilteredDirectoryKeys = new Set(keys)
    expandedKeys.value = keys
  } else if (wasFiltering) {
    knownFilteredDirectoryKeys.clear()
    expandedKeys.value = preFilterExpandedKeys ?? collectDirectoryKeys(treeData.value)
    preFilterExpandedKeys = null
  }
})

// 筛选模式下轮询新增匹配目录时自动展开，不覆盖用户手动折叠的已有目录
watch(filteredTreeData, (nodes) => {
  if (!isFiltering.value) {
    return
  }
  const currentKeys = collectDirectoryKeys(nodes)
  const newKeys = currentKeys.filter((key) => !knownFilteredDirectoryKeys.has(key))
  knownFilteredDirectoryKeys = new Set(currentKeys)
  if (newKeys.length > 0) {
    expandedKeys.value = Array.from(new Set([...expandedKeys.value, ...newKeys]))
  }
})

// 计算统计信息
const totalFiles = computed(() => props.torrent.files?.length || 0)
const selectedFiles = computed(() => {
  return props.torrent.fileStats?.filter((stat) => stat.wanted).length || 0
})
const totalSize = computed(() => {
  return props.torrent.files?.reduce((sum, file) => sum + file.length, 0) || 0
})

// 更新选中状态
watch(
  () => props.torrent.fileStats,
  (newStats) => {
    if (newStats) {
      const newCheckedKeys: string[] = []
      props.torrent.files?.forEach((file, index) => {
        if (newStats[index]?.wanted) {
          newCheckedKeys.push(file.name)
        }
      })
      checkedKeys.value = newCheckedKeys
    }
  },
  { immediate: true }
)

// 渲染文件/目录标签
const renderLabel = (nodeProps: any) => {
  const option = nodeProps.option as FileTreeNode
  return h('span', { class: 'truncate flex-1 min-w-0', title: option.path }, option.label)
}

// 渲染前缀图标
const renderPrefix = (nodeProps: any) => {
  const option = nodeProps.option as FileTreeNode
  const IconComponent = option.isDirectory ? FolderOutline : DocumentOutline
  return h('div', { class: 'flex items-center' }, [h(IconComponent, { size: 16, class: 'w-[16px] h-[16px]' })])
}

// 渲染后缀信息（固定列宽，目录行保留等宽占位以对齐）
const renderSuffix = (nodeProps: any) => {
  const option = nodeProps.option as FileTreeNode
  const percent = getProgressPercent(option.progress, option.isComplete)

  return h('div', { class: 'files-row-cells' }, [
    h('span', { class: 'col-size text-gray-500' }, formatSize(option.size)),
    h('div', { class: 'col-progress' }, [
      h(NProgress, {
        type: 'line',
        size: 'small',
        percentage: percent,
        'show-indicator': false,
        class: 'progress-bar'
      }),
      h('span', { class: 'progress-text text-gray-500' }, `${percent}%`)
    ]),
    h('div', { class: 'col-priority' }, [
      !option.isDirectory
        ? h(
            NDropdown,
            {
              options: priorityOptions,
              size: 'small',
              trigger: 'click',
              onSelect: (key: number) => handleFilePriority(option.fileIndex!, key)
            },
            () =>
              h(
                NTag,
                {
                  size: 'small',
                  color: priorityTagColorConfig[option.priority],
                  round: true,
                  bordered: false,
                  style: { cursor: 'pointer', minWidth: '48px', justifyContent: 'center' }
                },
                () => getPriorityString(option.priority as PriorityNumberType) || t('torrentDetail.files.normal')
              )
          )
        : null
    ])
  ])
}

function buildSelectionPayload(visibleCheckedSet: Set<string>) {
  const visibleFileKeys = isFiltering.value ? collectFileKeys(filteredTreeData.value) : null
  const previousCheckedSet = new Set(checkedKeys.value)

  const nextCheckedKeys: string[] = []
  const wantedIndices: number[] = []
  const unwantedIndices: number[] = []

  props.torrent.files?.forEach((file, index) => {
    const isChecked =
      visibleFileKeys && !visibleFileKeys.has(file.name)
        ? previousCheckedSet.has(file.name)
        : visibleCheckedSet.has(file.name)

    if (isChecked) {
      nextCheckedKeys.push(file.name)
      wantedIndices.push(index)
    } else {
      unwantedIndices.push(index)
    }
  })

  return { nextCheckedKeys, wantedIndices, unwantedIndices }
}

// 处理选中状态变化（筛选模式下仅更新当前可见文件，保留隐藏文件的勾选状态）
const onCheckedKeysChange = async (keys: string[]) => {
  const { nextCheckedKeys, wantedIndices, unwantedIndices } = buildSelectionPayload(new Set(keys))
  checkedKeys.value = nextCheckedKeys

  try {
    await rpc.torrentSet({
      ids: props.torrent.id,
      'files-wanted': wantedIndices,
      'files-unwanted': unwantedIndices
    })
    message.success(t('torrentDetail.files.fileSelectionUpdated'))
  } catch (error) {
    console.error('更新文件选择失败:', error)
    message.error(t('torrentDetail.files.updateFileSelectionFailed'))
  }
}

// 全选（筛选模式下仅全选当前可见文件）
const selectAll = async () => {
  const targetKeys = isFiltering.value
    ? collectFileKeys(filteredTreeData.value)
    : new Set(props.torrent.files?.map((file) => file.name) || [])
  const { nextCheckedKeys, wantedIndices, unwantedIndices } = buildSelectionPayload(targetKeys)
  checkedKeys.value = nextCheckedKeys

  try {
    await rpc.torrentSet({
      ids: props.torrent.id,
      'files-wanted': wantedIndices,
      'files-unwanted': unwantedIndices
    })
    message.success(
      isFiltering.value
        ? t('torrentDetail.files.filteredFilesSelected', { count: targetKeys.size })
        : t('torrentDetail.files.allFilesSelected')
    )
  } catch (error) {
    console.error('全选失败:', error)
    message.error(t('torrentDetail.files.selectAllFailed'))
  }
}

// 批量设置优先级（筛选模式下仅作用于当前可见的已勾选文件）
const handleBatchPriority = async (priority: number) => {
  const visibleFileKeys = isFiltering.value ? collectFileKeys(filteredTreeData.value) : null
  const checkedSet = new Set(checkedKeys.value)
  const selectedIndices: number[] = []

  props.torrent.files?.forEach((file, index) => {
    if (checkedSet.has(file.name) && (!visibleFileKeys || visibleFileKeys.has(file.name))) {
      selectedIndices.push(index)
    }
  })

  if (selectedIndices.length === 0) {
    message.warning(t('torrentDetail.files.pleaseSelectFiles'))
    return
  }

  try {
    const priorityArgs: Record<string, number[]> = {}

    if (priority === 1) {
      priorityArgs['priority-high'] = selectedIndices
    } else if (priority === -1) {
      priorityArgs['priority-low'] = selectedIndices
    } else {
      priorityArgs['priority-normal'] = selectedIndices
    }

    await rpc.torrentSet({
      ids: props.torrent.id,
      ...priorityArgs
    })
    torrentStore.fetchDetails()
    message.success(
      t('torrentDetail.files.prioritySet', {
        count: selectedIndices.length,
        priority: getPriorityString(priority as PriorityNumberType)
      })
    )
  } catch (error) {
    console.error('设置优先级失败:', error)
    message.error(t('torrentDetail.files.setPriorityFailed'))
  }
}

// 单个文件优先级设置
const handleFilePriority = async (fileIndex: number, priority: number) => {
  try {
    const priorityArgs: Record<string, number[]> = {}

    if (priority === 1) {
      priorityArgs['priority-high'] = [fileIndex]
    } else if (priority === -1) {
      priorityArgs['priority-low'] = [fileIndex]
    } else {
      priorityArgs['priority-normal'] = [fileIndex]
    }

    await rpc.torrentSet({
      ids: props.torrent.id,
      ...priorityArgs
    })
    torrentStore.fetchDetails()

    message.success(
      t('torrentDetail.files.filePrioritySet', { priority: getPriorityString(priority as PriorityNumberType) })
    )
  } catch (error) {
    console.error('设置文件优先级失败:', error)
    message.error(t('torrentDetail.files.setFilePriorityFailed'))
  }
}
</script>

<style scoped lang="less">
.files-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .files-toolbar {
    flex-shrink: 0;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border-color);
  }

  .files-summary {
    display: flex;
    align-items: center;
  }

  .files-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .files-search-input {
    width: 200px;
  }

  .files-table-scroll {
    flex: 1;
    min-height: 0;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .files-table-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 640px;
  }

  .files-table-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    height: 30px;
    padding: 0 8px 0 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-color-3);
    border-bottom: 1px solid var(--border-color);

    .col-name {
      flex: 1;
      min-width: 0;
    }

    .col-size,
    .col-progress,
    .col-priority {
      justify-content: center;
      text-align: center;
    }

    .col-size {
      text-align: right;
    }
  }

  .files-table-body {
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .files-empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.files-row-cells) {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    font-size: 12px;
  }

  .col-size,
  :deep(.col-size) {
    width: 88px;
    flex-shrink: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
    padding-right: 12px;
    box-sizing: border-box;
  }

  .col-progress,
  :deep(.col-progress) {
    width: 156px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 12px;
    box-sizing: border-box;

    .progress-bar {
      flex: 1;
      min-width: 0;
    }

    .progress-text {
      width: 38px;
      flex-shrink: 0;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  }

  .col-priority,
  :deep(.col-priority) {
    width: 72px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.n-tree) {
    width: 100%;

    .v-vl-visible-items,
    .n-tree-node-wrapper,
    .n-tree-node {
      width: 100%;
      min-width: 0;
    }

    .n-tree-node-content {
      height: 32px;
      padding-right: 8px;
      min-width: 0;
      overflow: hidden;

      .n-tree-node-content__text {
        flex: 1;
        display: flex;
        align-items: center;
        min-width: 0;
        overflow: hidden;
      }

      .n-tree-node-content__suffix {
        flex-shrink: 0;
        margin-left: 8px;
      }
    }

    .n-tree-node-switcher {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
  }
}
</style>
