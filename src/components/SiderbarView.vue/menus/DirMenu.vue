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
import { renderIcon } from '@/utils'
import { FileTray, Folder } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const dirMenuOptions = computed(() => {
  return [
    {
      label: $t('sidebar.directory'),
      key: 'dir',
      icon: renderIcon(FileTray),
      children: torrentStore.downloadDirOptions.map((item) => ({
        ...item,
        icon: renderIcon(item.icon || Folder)
      }))
    }
  ]
})
</script>
