<template>
  <n-dropdown
    v-model:show="show"
    trigger="manual"
    :x="x"
    :y="y"
    :options="dropdownOptions"
    @select="onDropdownSelect"
    class="row-drop-down-menus"
    :class="$style['row-drop-down-menus']"
    :to="to"
    :z-index="1000"
    :animated="false"
    :style="{ maxHeight: maxHeight, maxWidth: '60dvw' }"
    scrollable
  />
  <DeleteTorrentDialog v-model:show="showDeleteDialog" :ids="id ? [id] : undefined" />
  <ChangeDirDialog v-model:show="showChangeDirDialog" :ids="id ? [id] : undefined" />
  <ChangeLables v-model:show="showChangeLabelDialog" :ids="id ? [id] : undefined" />
  <ChangeTracker v-model:show="showChangeTrackerDialog" :ids="id ? [id] : undefined" />
  <OtherTorrentSetting v-model:show="showChangeOtherDialog" :ids="id ? [id] : undefined" />
  <RenameTorrentDialog v-model:show="showRenameDialog" :ids="id ? [id] : undefined" />
</template>

<script setup lang="ts">
import { rpc } from '@/api/rpc'
import { useSettingStore, useTorrentStore } from '@/store'
import { ensurePathDelimiter, renderIcon, sleep, copyToClipboard } from '@/utils/index'
import { useMessage } from 'naive-ui'

import ArrowDownIcon from '@/assets/icons/arrowDown.svg?component'
import ArrowUpIcon from '@/assets/icons/arrowUp.svg?component'
import DismissSquareIcon from '@/assets/icons/dismissSquare.svg?component'
import DoubleArrowDownIcon from '@/assets/icons/doubleArrowDown.svg?component'
import DoubleArrowUpIcon from '@/assets/icons/doubleArrowUp.svg?component'
import FolderCopyIcon from '@/assets/icons/folderCopy.svg?component'
import {
  CaretForwardCircle,
  CopySharp,
  CreateOutline,
  FlashSharp,
  FolderOpenSharp,
  MagnetSharp,
  PauseCircle,
  Pricetags,
  RefreshCircle,
  SettingsSharp,
  StarSharp,
  WifiSharp
} from '@vicons/ionicons5'
import AnyTouchCore from 'any-touch'
import { useThemeVars } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { getSelectIds } from '../dialog/utils'

const settingStore = useSettingStore()
const at = new AnyTouchCore(document.body, {
  preventDefault: false
})
at.use(AnyTouchCore.tap)

const theme = useThemeVars()
const torrentStore = useTorrentStore()
const { t } = useI18n()
const props = defineProps<{
  x: number
  y: number
  to: string
  id?: number
}>()
const show = defineModel<boolean>('show')
const maxHeight = ref('auto')
const message = useMessage()
const showDeleteDialog = ref(false)
const showChangeDirDialog = ref(false)
const showChangeLabelDialog = ref(false)
const showChangeTrackerDialog = ref(false)
const showChangeOtherDialog = ref(false)
const showRenameDialog = ref(false)
const dropdownOptions = computed(() => {
  return [
    { label: t('rowMenu.forceStart'), key: 'forceStart', icon: renderIcon(FlashSharp, theme.value.primaryColor) },
    { label: t('rowMenu.start'), key: 'start', icon: renderIcon(CaretForwardCircle, theme.value.primaryColor) },
    { label: t('rowMenu.stop'), key: 'stop', icon: renderIcon(PauseCircle, theme.value.primaryColor) },
    { label: t('rowMenu.verify'), key: 'verify', icon: renderIcon(RefreshCircle, theme.value.primaryColor) },
    { label: t('rowMenu.remove'), key: 'remove', icon: renderIcon(DismissSquareIcon, theme.value.errorColor) },
    {
      type: 'divider',
      key: 'd1'
    },
    { label: t('rowMenu.reannounce'), key: 'reannounce', icon: renderIcon(RefreshCircle, theme.value.primaryColor) },
    { label: t('rowMenu.changeDir'), key: 'changeDir', icon: renderIcon(FolderOpenSharp, theme.value.primaryColor) },
    { label: t('rowMenu.rename'), key: 'rename', icon: renderIcon(CreateOutline, theme.value.primaryColor) },
    {
      type: 'divider',
      key: 'd2'
    },
    { label: t('rowMenu.copyName'), key: 'copyName', icon: renderIcon(CopySharp, theme.value.primaryColor) },
    { label: t('rowMenu.copyPath'), key: 'copyPath', icon: renderIcon(FolderCopyIcon, theme.value.primaryColor) },
    { label: t('rowMenu.copyMagnet'), key: 'copyMagnet', icon: renderIcon(MagnetSharp, theme.value.primaryColor) },
    {
      type: 'divider',
      key: 'd3'
    },
    { label: t('rowMenu.changeLabel'), key: 'changeLabel', icon: renderIcon(Pricetags, theme.value.primaryColor) },
    {
      label: t('rowMenu.queue'),
      key: 'queue',
      icon: renderIcon(StarSharp, theme.value.primaryColor),
      children: [
        {
          label: t('rowMenu.moveTop'),
          key: 'moveTop',
          icon: renderIcon(DoubleArrowUpIcon, theme.value.infoColor)
        },
        {
          label: t('rowMenu.moveUp'),
          key: 'moveUp',
          icon: renderIcon(ArrowUpIcon, theme.value.infoColor)
        },
        {
          label: t('rowMenu.moveDown'),
          key: 'moveDown',
          icon: renderIcon(ArrowDownIcon, theme.value.infoColor)
        },
        {
          label: t('rowMenu.moveBottom'),
          key: 'moveBottom',
          icon: renderIcon(DoubleArrowDownIcon, theme.value.infoColor)
        }
      ]
    },
    {
      type: 'divider',
      key: 'd4'
    },
    {
      label: t('rowMenu.changeTracker'),
      key: 'changeTracker',
      icon: renderIcon(WifiSharp, theme.value.primaryColor)
    },
    {
      label: t('rowMenu.other'),
      key: 'other',
      icon: renderIcon(SettingsSharp, theme.value.primaryColor)
    }
  ]
})

watch(
  () => props.y,
  (y) => {
    const clientHeight = document.documentElement.clientHeight
    const m = clientHeight - y
    let d = 20
    if (y > m) {
      d = Math.max(20, settingStore.safeArea.top)
    } else {
      d = Math.max(20, settingStore.safeArea.bottom)
    }
    maxHeight.value = `${m > y ? m - d : y - d}px`
  }
)
const closeDropdown = (e: any) => {
  if (
    e.target instanceof HTMLElement &&
    (e.target.closest('.row-drop-down-menus') ||
      e.target.closest('.canvas-mobile-list-scroll-holder, .canvas-list-scroll-holder'))
  ) {
    return
  }
  show.value = false
}
onMounted(() => {
  at.on('tap', closeDropdown)
})
onUnmounted(() => {
  at.off('tap', closeDropdown)
})
async function onDropdownSelect(key: string) {
  const ids = getSelectIds(props.id ? [props.id] : undefined, torrentStore.selectedKeys)
  if (!ids || ids.length === 0) {
    message.warning(t('messages.pleaseSelectTask'))
    return
  }
  switch (key) {
    case 'start':
      await rpc.torrentStart(ids)
      await sleep(1000)
      await torrentStore.fetchTorrents()
      message.success(t('messages.taskStarted'))
      break
    case 'forceStart':
      await rpc.torrentStartNow(ids)
      await sleep(1000)
      await torrentStore.fetchTorrents()
      message.success(t('messages.taskForceStarted'))
      break
    case 'stop':
      await rpc.torrentStop(ids)
      await sleep(1000)
      await torrentStore.fetchTorrents()
      message.success(t('messages.taskPaused'))
      break
    case 'verify':
      await rpc.torrentVerify(ids)
      await sleep(1000)
      await torrentStore.fetchTorrents()
      message.success(t('messages.taskVerified'))
      break
    case 'remove':
      showDeleteDialog.value = true
      break
    case 'copyName':
      const names = ids.map((id) => torrentStore.torrents.find((t) => t.id === id)?.name).join('\n')
      const nameSuccess = await copyToClipboard(names)
      if (nameSuccess) {
        message.success(t('messages.nameCopied'))
      } else {
        message.error(t('messages.copyFailed'))
      }
      break
    case 'copyPath':
      const paths = ids
        .map((id) => {
          const t = torrentStore.torrents.find((t) => t.id === id)
          return t ? `${ensurePathDelimiter(t.downloadDir, t.name)}` : ''
        })
        .join('\n')
      const pathSuccess = await copyToClipboard(paths)
      if (pathSuccess) {
        message.success(t('messages.pathCopied'))
      } else {
        message.error(t('messages.copyFailed'))
      }
      break
    case 'copyMagnet':
      const magnets = ids.map((id) => torrentStore.torrents.find((t) => t.id === id)?.magnetLink).join('\n')
      const magnetSuccess = await copyToClipboard(magnets)
      if (magnetSuccess) {
        message.success(t('messages.magnetCopied'))
      } else {
        message.error(t('messages.copyFailed'))
      }
      break
    case 'reannounce':
      await rpc.torrentReannounce(ids)
      await sleep(1000)
      await torrentStore.fetchTorrents()
      message.success(t('messages.reannounced'))
      break
    case 'changeDir':
      showChangeDirDialog.value = true
      break
    case 'rename':
      showRenameDialog.value = true
      break
    case 'changeLabel':
      showChangeLabelDialog.value = true
      break
    case 'moveTop':
      await rpc.queueMoveTop(ids)
      await sleep(1000)
      await torrentStore.fetchTorrents()
      message.success(t('messages.movedToTop'))
      break
    case 'moveUp':
      await rpc.queueMoveUp(ids)
      await sleep(1000)
      await torrentStore.fetchTorrents()
      message.success(t('messages.movedUp'))
      break
    case 'moveDown':
      await rpc.queueMoveDown(ids)
      await sleep(1000)
      await torrentStore.fetchTorrents()
      message.success(t('messages.movedDown'))
      break
    case 'moveBottom':
      await rpc.queueMoveBottom(ids)
      await sleep(1000)
      await torrentStore.fetchTorrents()
      message.success(t('messages.movedToBottom'))
      break
    case 'changeTracker':
      showChangeTrackerDialog.value = true
      break
    case 'other':
      showChangeOtherDialog.value = true
      break
  }
}
</script>

<style lang="less" module>
.row-drop-down-menus {
  :global {
    .n-scrollbar-container {
      .n-scrollbar-content {
        min-width: fit-content;
        .n-dropdown-divider {
          width: 100%;
          min-width: fit-content;
        }
        .n-dropdown-option {
          min-width: fit-content;
        }
      }
    }
  }
}
</style>
