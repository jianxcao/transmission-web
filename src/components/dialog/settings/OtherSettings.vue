<template>
  <div>
    <div class="text-lg font-medium mb-2">{{ $t('otherSettings.title') }}</div>

    <n-form :label-placement="labelType" :label-width="labelType === 'top' ? undefined : 220" :model="form">
      <n-form-item :label="$t('otherSettings.singleLine')">
        <n-switch v-model:value="form['single-line']" />
      </n-form-item>
      <n-form-item :label="$t('otherSettings.dirMenuMode')">
        <n-radio-group v-model:value="form['dir-menu-mode']">
          <n-radio-button value="list">{{ $t('otherSettings.dirMenuModeList') }}</n-radio-button>
          <n-radio-button value="tree">{{ $t('otherSettings.dirMenuModeTree') }}</n-radio-button>
        </n-radio-group>
        <n-text depth="3" style="font-size: 12px; margin-left: 8px">
          {{ $t('otherSettings.dirMenuModeHint') }}
        </n-text>
      </n-form-item>
      <n-form-item :label="$t('otherSettings.enableDownloadDirSuggestions')">
        <div style="width: 100%">
          <n-switch v-model:value="form['enable-download-dir-suggestions']" />
          <n-text depth="3" style="font-size: 12px; margin-top: 4px; display: block">
            {{ $t('otherSettings.enableDownloadDirSuggestionsHint') }}
          </n-text>
        </div>
      </n-form-item>
      <n-form-item :label="$t('otherSettings.customDownloadDirs')">
        <div style="width: 100%">
          <n-dynamic-input
            v-model:value="form['custom-download-dirs']"
            :placeholder="$t('otherSettings.customDownloadDirsPlaceholder')"
            :min="0"
            show-sort-button
            preset="input"
            @create="createCustomDownloadDir"
          />
          <n-text depth="3" style="font-size: 12px; margin-top: 4px; display: block">
            {{ $t('otherSettings.customDownloadDirsHint') }}
          </n-text>
        </div>
      </n-form-item>
      <n-form-item>
        <template #label>
          <n-checkbox v-model:checked="form['script-torrent-done-enabled']">{{
            $t('otherSettings.enableScript')
          }}</n-checkbox>
        </template>
        <n-input
          v-model:value="form['script-torrent-done-filename']"
          :placeholder="$t('otherSettings.scriptPlaceholder')"
          class="w-80"
        />
      </n-form-item>
      <n-form-item :label="$t('otherSettings.ignoredPrefixes')">
        <div style="width: 100%">
          <n-dynamic-tags v-model:value="ignoredTrackerPrefixes" @update:value="handleIgnoredPrefixesChange" />
          <n-text depth="3" style="font-size: 12px; margin-top: 4px; display: block">
            {{ $t('otherSettings.ignoredPrefixesHint') }}
          </n-text>
        </div>
      </n-form-item>
      <n-form-item :label="$t('otherSettings.defaultTrackers')">
        <n-input
          type="textarea"
          :autosize="{ minRows: 5, maxRows: 10 }"
          v-model:value="form['default-trackers']"
          :placeholder="$t('otherSettings.defaultTrackersPlaceholder')"
          class="w-80"
        />
      </n-form-item>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { useSettingStore } from '@/store'
const isMobile = useIsSmallScreen()
const labelType = computed(() => (isMobile ? 'top' : 'left'))
const { t: $t } = useI18n()
const settingStore = useSettingStore()
const form = defineModel<any>('form', { required: true })

// 管理忽略的 Tracker 前缀
const ignoredTrackerPrefixes = ref<string[]>([])

// 初始化时从 store 加载数据
watchEffect(() => {
  ignoredTrackerPrefixes.value = [...settingStore.setting.ignoredTrackerPrefixes]
})

// 更新 store 中的数据
const handleIgnoredPrefixesChange = (value: string[]) => {
  settingStore.changeIgnoredTrackerPrefixes(value)
}

// n-dynamic-input 默认 create 返回 undefined，这里给一个空字符串占位以便用户填写
const createCustomDownloadDir = () => ''
</script>
