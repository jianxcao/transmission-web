<template>
  <n-menu
    :indent="8"
    :options="statusMenuOptions"
    v-model:value="torrentStore.statusFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
  />
</template>
<script setup lang="ts">
import MagnetIcon from '@/assets/icons/magnet.svg?component'
import { useTorrentStore, useSettingStore } from '@/store'
import { renderIcon } from '@/utils'
import { ShuffleOutline } from '@vicons/ionicons5'
import { useI18n } from 'vue-i18n'

const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const statusMenuOptions = computed(() => {
  return [
    {
      label: $t('sidebar.status'),
      key: 'status',
      icon: renderIcon(MagnetIcon),
      children: torrentStore.statusOptions.map((item) => ({
        ...item,
        icon: renderIcon(item.icon || ShuffleOutline, item.color)
      }))
    }
  ]
})
</script>
