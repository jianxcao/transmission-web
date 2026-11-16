<template>
  <div class="dir-menu" :style="menuStyle">
    <button type="button" class="dir-menu-row is-group" @click="toggleGroup">
      <n-icon :component="FileTray" :size="18" />
      <span class="dir-menu-label">{{ $t('sidebar.directory') }}</span>
      <n-icon class="dir-menu-arrow" :class="{ 'is-expanded': groupExpanded }" :component="ChevronForward" :size="14" />
    </button>
    <div v-if="groupExpanded">
      <button
        type="button"
        class="dir-menu-row"
        :class="{ 'is-selected': torrentStore.downloadDirFilter === 'all' }"
        :style="{ paddingLeft: '40px' }"
        @click="selectDir('all')"
      >
        <n-icon :component="ShuffleOutline" :size="16" />
        <span class="dir-menu-label">{{ $t('common.all', { total: torrentStore.torrents.length }) }}</span>
      </button>
      <DirMenuNode
        v-for="option in torrentStore.downloadDirMenuOptions"
        :key="option.key"
        :option="option"
        :depth="1"
        :selected-key="torrentStore.downloadDirFilter"
        :expanded-keys="expandedKeySet"
        @select="selectDir"
        @toggle="toggleExpanded"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useSettingStore, useTorrentStore } from '@/store'
import { ChevronForward, FileTray, ShuffleOutline } from '@vicons/ionicons5'
import DirMenuNode from './DirMenuNode.vue'

const torrentStore = useTorrentStore()
const settingStore = useSettingStore()

const groupKey = 'dir'
const theme = computed(() => settingStore.themeVars)
const expandedKeySet = computed(() => new Set(settingStore.menuExpandedKeys))
const groupExpanded = computed(() => expandedKeySet.value.has(groupKey))
const menuStyle = computed(() => ({
  '--dir-text': theme.value.textColor2,
  '--dir-text-active': theme.value.primaryColor,
  '--dir-hover': theme.value.hoverColor,
  '--dir-active': `color-mix(in srgb, ${theme.value.primaryColor} 16%, transparent)`,
  '--dir-arrow': theme.value.textColor3,
  '--dir-radius': theme.value.borderRadius
}))

const setExpanded = (key: string, expanded: boolean) => {
  const keys = new Set(settingStore.menuExpandedKeys)
  if (expanded) {
    keys.add(key)
  } else {
    keys.delete(key)
  }
  settingStore.menuExpandedKeys = [...keys]
}

const toggleGroup = () => setExpanded(groupKey, !groupExpanded.value)
const toggleExpanded = (key: string) => setExpanded(key, !expandedKeySet.value.has(key))
const selectDir = (key: string) => {
  torrentStore.downloadDirFilter = key
}
</script>

<style lang="less">
.sidebar-view .dir-menu {
  margin-bottom: 6px;
  color: var(--dir-text);
  font-size: 14px;
  line-height: 1.25;

  .dir-menu-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 32px;
    padding: 0 12px 0 32px;
    border: 0;
    border-radius: var(--dir-radius);
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .dir-menu-row:hover {
    background: var(--dir-hover);
  }

  .dir-menu-row.is-selected {
    background: var(--dir-active);
    color: var(--dir-text-active);
  }

  .dir-menu-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dir-menu-arrow {
    flex: none;
    color: var(--dir-arrow);
    transition: transform 0.2s;
  }

  .dir-menu-arrow.is-expanded {
    transform: rotate(90deg);
  }
}
</style>
