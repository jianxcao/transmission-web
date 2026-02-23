<template>
  <n-dropdown trigger="click" :options="mobileActionOptions" @select="onSelect" :animated="false">
    <n-button quaternary circle>
      <n-icon :component="MenuSharp" size="24" />
    </n-button>
  </n-dropdown>
</template>
<script setup lang="ts">
import DismissSquareIcon from '@/assets/icons/dismissSquare.svg?component'
import { useTorrentStore, useSessionStore } from '@/store'
import { renderIcon } from '@/utils'
import {
  AddCircle,
  ArrowDownCircleSharp,
  ArrowUpCircleSharp,
  CaretForwardCircle,
  FolderOpenSharp,
  MenuSharp,
  PauseCircle,
  Pricetags,
  StarSharp,
  Magnet,
  CreateOutline,
  FlashOutline,
  SwapHorizontalOutline
} from '@vicons/ionicons5'
import { useThemeVars } from 'naive-ui'
import { priorityOptions } from './priority'
import { useI18n } from 'vue-i18n'

const theme = useThemeVars()
const emit = defineEmits(['action'])
const torrentStore = useTorrentStore()
const sessionStore = useSessionStore()
const { t: $t } = useI18n()

const isOk = computed(() => torrentStore.selectedKeys.length > 0)
const altSpeedEnabled = computed(() => sessionStore.session?.['alt-speed-enabled'] ?? false)

const mobileActionOptions = computed(() => [
  {
    label: $t('common.addMagnet'),
    key: 'addMagnet',
    icon: renderIcon(Magnet, theme.value.primaryColor)
  },
  {
    label: $t('common.addTorrent'),
    key: 'addTorrent',
    icon: renderIcon(AddCircle, theme.value.primaryColor)
  },
  {
    label: $t('common.createTorrent'),
    key: 'createTorrent',
    icon: renderIcon(CreateOutline, theme.value.successColor)
  },
  {
    label: $t('common.startTasks'),
    key: 'start',
    disabled: !isOk.value,
    icon: renderIcon(CaretForwardCircle, theme.value.primaryColor)
  },
  {
    label: $t('common.pauseTasks'),
    key: 'pause',
    disabled: !isOk.value,
    icon: renderIcon(PauseCircle, theme.value.primaryColor)
  },
  {
    label: $t('common.deleteTasks'),
    key: 'remove',
    disabled: !isOk.value,
    icon: renderIcon(DismissSquareIcon, theme.value.errorColor)
  },
  {
    type: 'divider',
    key: 'd1'
  },
  {
    label: $t('common.moveUp'),
    key: 'moveUp',
    disabled: !isOk.value,
    icon: renderIcon(ArrowUpCircleSharp, theme.value.infoColor)
  },
  {
    label: $t('common.moveDown'),
    key: 'moveDown',
    disabled: !isOk.value,
    icon: renderIcon(ArrowDownCircleSharp, theme.value.infoColor)
  },
  {
    type: 'divider',
    key: 'd2'
  },
  {
    label: $t('common.changeDirectory'),
    key: 'changeDir',
    disabled: !isOk.value,
    icon: renderIcon(FolderOpenSharp, theme.value.warningColor)
  },
  {
    label: $t('common.changeLabels'),
    key: 'changeLabel',
    disabled: !isOk.value,
    icon: renderIcon(Pricetags, theme.value.infoColor)
  },
  {
    label: $t('common.priority'),
    key: 'priority',
    disabled: !isOk.value,
    icon: renderIcon(StarSharp, theme.value.warningColor),
    children: priorityOptions.map((item) => ({
      ...item,
      key: `priority${item.key}`
    }))
  },
  {
    type: 'divider',
    key: 'd3'
  },
  {
    label: altSpeedEnabled.value
      ? $t('bandwidthSettings.disableBackupBandwidth')
      : $t('bandwidthSettings.enableBackupBandwidth'),
    key: 'toggleAltSpeed',
    icon: renderIcon(FlashOutline, altSpeedEnabled.value ? theme.value.warningColor : theme.value.textColorBase)
  },
  {
    type: 'divider',
    key: 'd4'
  },
  {
    label: $t('toolsMenu.replaceTracker'),
    key: 'replaceTracker',
    icon: renderIcon(SwapHorizontalOutline, theme.value.infoColor)
  }
])

function onSelect(key: string) {
  emit('action', key)
}
</script>
