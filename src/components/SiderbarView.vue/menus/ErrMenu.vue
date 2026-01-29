<template>
  <n-menu
    :indent="8"
    :options="errorMenuOptions"
    v-model:value="torrentStore.errorStringFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
  />
</template>
<script setup lang="ts">
import DismissSquareIcon from '@/assets/icons/dismissSquare.svg?component'
import { useTorrentStore, useSettingStore } from '@/store'
import { renderIcon } from '@/utils'
import { useI18n } from 'vue-i18n'
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const errorMenuOptions = computed(() => {
  return [
    {
      label: $t('sidebar.error'),
      key: 'error',
      icon: renderIcon(DismissSquareIcon, 'var(--error-color)'),
      children: torrentStore.errorStringOptions.map((item) => ({
        ...item,
        icon: renderIcon(item.icon || DismissSquareIcon, item.color)
      }))
    }
  ]
})
</script>
