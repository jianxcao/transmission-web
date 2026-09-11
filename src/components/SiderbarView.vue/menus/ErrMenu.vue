<template>
  <n-menu
    class="error-menu"
    :indent="8"
    :options="errorMenuOptions"
    v-model:value="torrentStore.errorStringFilter"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
  />
</template>
<script setup lang="ts">
import DismissSquareIcon from '@/assets/icons/dismissSquare.svg?component'
import { useTorrentStore, useSettingStore } from '@/store'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { renderIcon } from '@/utils'
import { NEllipsis, type MenuOption } from 'naive-ui'
import { useI18n } from 'vue-i18n'
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const { t: $t } = useI18n()
const isMobile = useIsSmallScreen()

const renderErrorLabel = (label: string) => () =>
  h(
    NEllipsis,
    {
      class: 'error-menu-label',
      tooltip: {
        trigger: isMobile.value ? 'click' : 'hover',
        placement: isMobile.value ? 'bottom-start' : 'right',
        maxWidth: isMobile.value ? undefined : 520,
        contentStyle: {
          maxWidth: 'calc(100vw - 32px)',
          whiteSpace: 'normal',
          overflowWrap: 'anywhere'
        }
      }
    },
    {
      default: () => label,
      tooltip: () => label
    }
  )

const errorMenuOptions = computed<MenuOption[]>(() => {
  return [
    {
      label: $t('sidebar.error'),
      key: 'error',
      icon: renderIcon(DismissSquareIcon, 'var(--error-color)'),
      children: torrentStore.errorStringOptions.map((item) => ({
        ...item,
        label: renderErrorLabel(item.label),
        icon: renderIcon(item.icon || DismissSquareIcon, item.color)
      }))
    }
  ]
})
</script>

<style scoped lang="less">
.error-menu {
  :deep(.n-menu-item-content-header) {
    min-width: 0;
  }
  :deep(.error-menu-label) {
    display: block;
    width: 100%;
    min-width: 0;
  }
}
</style>
