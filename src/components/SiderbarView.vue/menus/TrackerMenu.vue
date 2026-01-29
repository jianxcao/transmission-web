<template>
  <n-menu
    :indent="8"
    :options="menuOpts"
    v-model:value="torrentStore.trackerFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
  />
</template>
<script setup lang="ts">
import StormTracker from '@/assets/icons/stormTracker.svg?component'
import { useTorrentStore, useSettingStore } from '@/store'
import { renderIcon } from '@/utils'
import { useI18n } from 'vue-i18n'

const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const menuOpts = computed(() => {
  return [
    {
      label: $t('sidebar.tracker'),
      key: 'tracker',
      icon: renderIcon(StormTracker),
      children: torrentStore.trackerOptions.map((item) => ({
        ...item,
        icon: renderIcon(item.icon || StormTracker)
      }))
    }
  ]
})
</script>
