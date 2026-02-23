<template>
  <div class="h-full flex items-center justify-between flex-1">
    <!-- 左侧按钮分组 -->
    <div class="flex items-center gap-4 hidden md:flex">
      <!-- 组1：添加磁力链接、添加种子 -->
      <div class="group-item">
        <IconButton :icon="Magnet" :tooltip="$t('common.addMagnet')" @click="onAddMagnet" :color="theme.primaryColor" />
        <IconButton
          :icon="AddCircle"
          :tooltip="$t('common.addTorrent')"
          @click="onAddTorrent"
          :color="theme.primaryColor"
        />
        <IconButton
          :icon="CreateOutline"
          :tooltip="$t('common.createTorrent')"
          @click="onCreateTorrent"
          :color="theme.successColor"
        />
      </div>
      <!-- 组2：开始、暂停、删除 -->
      <div class="group-item">
        <IconButton
          :icon="CaretForwardCircle"
          :tooltip="$t('common.startTasks')"
          @click="onStart"
          :disabled="!torrentStore.selectedKeys.length"
          :color="theme.successColor"
        />
        <IconButton
          :icon="PauseCircle"
          :tooltip="$t('common.pauseTasks')"
          @click="onPause"
          :disabled="!torrentStore.selectedKeys.length"
          :color="theme.warningColor"
        />
        <IconButton
          :icon="DismissSquareIcon"
          :tooltip="$t('common.deleteTasks')"
          @click="onRemove"
          :color="theme.errorColor"
          :disabled="!torrentStore.selectedKeys.length"
        />
      </div>
      <!-- 组3：上移、下移、修改目录、标签、优先级（用 slot 传递占位图标） -->
      <div class="group-item">
        <IconButton
          :tooltip="$t('common.moveUp')"
          @click="onMoveUp"
          :disabled="!torrentStore.selectedKeys.length"
          :icon="ArrowUpCircleSharp"
          :color="theme.infoColor"
        />
        <IconButton
          :tooltip="$t('common.moveDown')"
          @click="onMoveDown"
          :disabled="!torrentStore.selectedKeys.length"
          :icon="ArrowDownCircleSharp"
          :color="theme.infoColor"
        />
      </div>
      <div class="group-item">
        <IconButton
          :tooltip="$t('common.changeDirectory')"
          @click="onChangeDir"
          :disabled="!torrentStore.selectedKeys.length"
          :icon="FolderOpenSharp"
          :color="theme.warningColor"
        />
        <IconButton
          :tooltip="$t('common.changeLabels')"
          @click="onChangeLabel"
          :disabled="!torrentStore.selectedKeys.length"
          :icon="Pricetags"
          :color="theme.infoColor"
        />
        <n-dropdown
          :options="priorityOptions"
          @select="onSelectPriority"
          trigger="hover"
          :disabled="!torrentStore.selectedKeys.length"
        >
          <n-button
            quaternary
            circle
            size="large"
            v-bind="$attrs"
            v-on="$attrs"
            :disabled="!torrentStore.selectedKeys.length"
          >
            <n-icon :component="StarSharp" size="24" :color="theme.warningColor" />
          </n-button>
        </n-dropdown>
        <IconButton
          :tooltip="$t('toolsMenu.replaceTracker')"
          @click="showReplaceTrackerDialog = true"
          :icon="SwapHorizontalOutline"
          :color="theme.infoColor"
        />
        <IconButton
          :tooltip="
            (altSpeedEnabled
              ? $t('bandwidthSettings.disableBackupBandwidth')
              : $t('bandwidthSettings.enableBackupBandwidth')) +
            ' ' +
            $t('bandwidthSettings.backupBandwidthShortcut')
          "
          @click="onToggleAltSpeed"
          :icon="FlashOutline"
          :color="altSpeedEnabled ? theme.warningColor : theme.primaryColor"
        />
        <IconButton
          :tooltip="toolbarStore.selectMode ? $t('rowMenu.hideCheckbox') : $t('rowMenu.showCheckbox')"
          @click="onToggleSelectMode"
          :icon="CheckboxOutline"
          :color="toolbarStore.selectMode ? theme.primaryColor : theme.infoColor"
        />
      </div>
    </div>
    <!-- 种子操作下拉菜单：md及以下显示 -->
    <div class="md:hidden">
      <MobileActionDropdown
        v-model:search="torrentStore.search"
        :selected-keys="torrentStore.selectedKeys"
        @action="onMobileActionSelect"
      />
    </div>
    <div class="flex-1 mx-2">
      <!-- 搜索框 -->
      <n-input
        v-model:value="torrentStore.search"
        :placeholder="$t('common.searchPlaceholder')"
        class="max-w-[600px]"
        clearable
      />
    </div>
    <!-- 右侧设置按钮 -->
    <div class="flex items-center gap-2">
      <LanguageSwitcher />
      <IconButton
        :tooltip="$t('common.settings')"
        @click="onSetting"
        :icon="SettingsSharp"
        :color="theme.primaryColor"
      />
      <IconButton
        v-if="!isMobile"
        :tooltip="$t('common.details')"
        @click="onLayoutBottom"
        :icon="LayoutBottom"
        :color="theme.primaryColor"
      />
    </div>
    <DeleteTorrentDialog v-model:show="showDeleteDialog" />
    <AddDialog v-model:show="showAddMagnetDialog" :type="addDialogType" />
    <CreateTorrentDialog v-model:show="showCreateTorrentDialog" />
    <ChangeDirDialog v-model:show="showChangeDirDialog" />
    <ChangeLables v-model:show="showChangeLabelDialog" />
    <SettingsDialog v-model:show="showSettingsDialog" />
    <ReplaceTrackerDialog v-model:show="showReplaceTrackerDialog" />
  </div>
</template>
<script setup lang="ts">
import DismissSquareIcon from '@/assets/icons/dismissSquare.svg?component'
import LayoutBottom from '@/assets/icons/layoutBottom.svg?component'
import { useTorrentStore, useSessionStore } from '@/store'
import useToolbarStore from '@/components/CanvasList/store/toolbarStore'
import {
  AddCircle,
  CaretForwardCircle,
  Magnet,
  PauseCircle,
  ArrowUpCircleSharp,
  ArrowDownCircleSharp,
  FolderOpenSharp,
  StarSharp,
  Pricetags,
  CreateOutline,
  SettingsSharp,
  CheckboxOutline,
  SwapHorizontalOutline,
  FlashOutline
} from '@vicons/ionicons5'
import { useThemeVars } from 'naive-ui'
import { rpc } from '@/api/rpc'
import { useMessage } from 'naive-ui'
import { sleep } from '@/utils'
import { priorityOptions } from './priority'
import SettingsDialog from '../dialog/settings/SettingsDialog.vue'
import CreateTorrentDialog from '../dialog/CreateTorrentDialog.vue'
import ReplaceTrackerDialog from '../dialog/ReplaceTrackerDialog.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { useI18n } from 'vue-i18n'
const emit = defineEmits(['layoutBottom'])
const toolbarStore = useToolbarStore()
const torrentStore = useTorrentStore()
const sessionStore = useSessionStore()
const theme = useThemeVars()
const message = useMessage()
const { t: $t } = useI18n()
const addDialogType = ref<'file' | 'magnet'>('file')
const showDeleteDialog = ref(false)
const showAddMagnetDialog = ref(false)
const showCreateTorrentDialog = ref(false)
const showChangeDirDialog = ref(false)
const showChangeLabelDialog = ref(false)
const showSettingsDialog = ref(false)
const showReplaceTrackerDialog = ref(false)
const isMobile = useIsSmallScreen()
const router = useRouter()

// 备用带宽模式状态
const altSpeedEnabled = computed(() => sessionStore.session?.['alt-speed-enabled'] ?? false)

// 切换备用带宽模式
const onToggleAltSpeed = async () => {
  try {
    const newState = !altSpeedEnabled.value
    await rpc.sessionSet({
      'alt-speed-enabled': newState
    })
    await sessionStore.fetchSession()
    message.success(newState ? $t('bandwidthSettings.backupEnabled') : $t('bandwidthSettings.backupDisabled'))
  } catch (error) {
    console.error(error)
    message.error($t('bandwidthSettings.backupToggleFailed'))
  }
}
// 切换选择模式
const onToggleSelectMode = () => {
  toolbarStore.setSelectMode(!toolbarStore.selectMode)
}

const onAddMagnet = () => {
  addDialogType.value = 'magnet'
  showAddMagnetDialog.value = true
}

const onAddTorrent = () => {
  addDialogType.value = 'file'
  showAddMagnetDialog.value = true
}

const onCreateTorrent = () => {
  showCreateTorrentDialog.value = true
}

const onStart = async () => {
  if (!torrentStore.selectedKeys.length) {
    return
  }
  await rpc.torrentStart(torrentStore.selectedKeys)
  await sleep(1000)
  await torrentStore.fetchTorrents()
  message.success($t('message.taskStarted'))
}

const onPause = async () => {
  if (!torrentStore.selectedKeys.length) {
    return
  }
  await rpc.torrentStop(torrentStore.selectedKeys)
  await sleep(1000)
  await torrentStore.fetchTorrents()
  message.success($t('message.taskPaused'))
}

const onRemove = () => {
  if (!torrentStore.selectedKeys.length) {
    return
  }
  showDeleteDialog.value = true
}

const onMoveUp = async () => {
  if (!torrentStore.selectedKeys.length) {
    return
  }
  await rpc.queueMoveUp(torrentStore.selectedKeys)
  await torrentStore.fetchTorrents()
  message.success($t('message.taskMovedUp'))
}

const onMoveDown = async () => {
  if (!torrentStore.selectedKeys.length) {
    return
  }
  await rpc.queueMoveDown(torrentStore.selectedKeys)
  await torrentStore.fetchTorrents()
  message.success($t('message.taskMovedDown'))
}

const onChangeDir = () => {
  showChangeDirDialog.value = true
}

const onChangeLabel = () => {
  showChangeLabelDialog.value = true
}

const onSelectPriority = async (priority: number) => {
  if (!torrentStore.selectedKeys.length) {
    return
  }
  try {
    await rpc.torrentSet({
      ids: torrentStore.selectedKeys,
      bandwidthPriority: priority
    })
    message.success($t('message.priorityChanged'))
    await torrentStore.fetchTorrents()
  } catch (error) {
    console.error(error)
    message.error($t('message.priorityChangeFailed'))
  }
}

const onSetting = () => {
  if (isMobile.value) {
    // 移动端跳转到设置页面
    router.push('/settings')
  } else {
    // PC端显示设置弹窗
    showSettingsDialog.value = true
  }
}

const onLayoutBottom = () => {
  emit('layoutBottom')
}

// 监听快捷键
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+Shift+B 切换备用带宽模式
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault()
      onToggleAltSpeed()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
})

const onMobileActionSelect = async (key: string) => {
  switch (key) {
    case 'addMagnet':
      onAddMagnet()
      break
    case 'addTorrent':
      onAddTorrent()
      break
    case 'createTorrent':
      onCreateTorrent()
      break
    case 'start':
      await onStart()
      break
    case 'pause':
      await onPause()
      break
    case 'remove':
      onRemove()
      break
    case 'moveUp':
      await onMoveUp()
      break
    case 'moveDown':
      await onMoveDown()
      break
    case 'changeDir':
      onChangeDir()
      break
    case 'changeLabel':
      onChangeLabel()
      break
    case 'priority1':
      await onSelectPriority(1)
      break
    case 'priority0':
      await onSelectPriority(0)
      break
    case 'priority-1':
      await onSelectPriority(-1)
      break
    case 'toggleAltSpeed':
      await onToggleAltSpeed()
      break
    case 'replaceTracker':
      showReplaceTrackerDialog.value = true
      break
  }
}
</script>

<script lang="ts">
export default {
  name: 'AppHeader'
}
</script>

<style lang="less" scoped>
.group-item {
  gap: 6px;
  display: flex;
  align-items: center;
  border-left: 1px solid var(--border-color);
  &:first-child {
    border-left: none;
  }
}
</style>
