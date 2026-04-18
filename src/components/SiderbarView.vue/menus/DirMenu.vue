<template>
  <n-menu
    :indent="8"
    :options="dirMenuOptions"
    v-model:value="torrentStore.downloadDirFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
  />
</template>
<script setup lang="ts">
import { useTorrentStore, useSettingStore } from '@/store'
import type { IDirMenuOption } from '@/store/torrentUtils'
import { renderIcon } from '@/utils'
import { FileTray, Folder, ShuffleOutline } from '@vicons/ionicons5'
import type { MenuOption } from 'naive-ui'
import { useI18n } from 'vue-i18n'
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()

// 递归地把目录树节点转成 n-menu 选项，并补上图标
const decorate = (option: IDirMenuOption): MenuOption => {
  const menuOption: MenuOption = {
    key: option.key,
    label: option.label,
    icon: renderIcon(Folder)
  }
  if (option.children && option.children.length > 0) {
    menuOption.children = option.children.map(decorate)
  }
  return menuOption
}

const dirMenuOptions = computed<MenuOption[]>(() => {
  const total = torrentStore.torrents.length
  return [
    {
      label: $t('sidebar.directory'),
      key: 'dir',
      icon: renderIcon(FileTray),
      children: [
        {
          key: 'all',
          label: $t('common.all', { total }),
          icon: renderIcon(ShuffleOutline)
        },
        ...torrentStore.downloadDirMenuOptions.map(decorate)
      ]
    }
  ]
})
</script>
