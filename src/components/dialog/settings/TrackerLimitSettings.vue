<template>
  <div>
    <div class="text-lg font-medium mb-2">{{ $t('trackerLimitSettings.title') }}</div>
    <n-alert type="info" :show-icon="false" class="mb-4">
      {{ $t('trackerLimitSettings.hint') }}
    </n-alert>

    <div v-if="rules.length === 0" class="empty-rule">
      {{ $t('trackerLimitSettings.empty') }}
    </div>
    <div v-for="(rule, index) in rules" :key="rule.id" class="rule-row">
      <n-switch v-model:value="rule.enabled" :aria-label="$t('trackerLimitSettings.enabled')" />
      <n-input
        v-if="trackerOptions.length === 0"
        v-model:value="rule.pattern"
        class="pattern-input"
        :placeholder="$t('trackerLimitSettings.patternPlaceholder')"
        clearable
      />
      <n-select
        v-else
        v-model:value="rule.pattern"
        class="pattern-input"
        :options="getTrackerOptions(index)"
        :placeholder="$t('trackerLimitSettings.patternPlaceholder')"
        filterable
        tag
        clearable
      />
      <n-input-number
        v-model:value="rule.uploadLimit"
        :min="1"
        :precision="0"
        :placeholder="$t('trackerLimitSettings.uploadPlaceholder')"
        clearable
        class="limit-input"
      >
        <template #suffix>KB/s ↑</template>
      </n-input-number>
      <n-input-number
        v-model:value="rule.downloadLimit"
        :min="1"
        :precision="0"
        :placeholder="$t('trackerLimitSettings.downloadPlaceholder')"
        clearable
        class="limit-input"
      >
        <template #suffix>KB/s ↓</template>
      </n-input-number>
      <n-button
        quaternary
        circle
        :disabled="index === 0"
        :aria-label="$t('trackerLimitSettings.moveUp')"
        @click="moveRule(index, -1)"
      >
        <template #icon>
          <n-icon><ArrowUpOutline /></n-icon>
        </template>
      </n-button>
      <n-button
        quaternary
        circle
        :disabled="index === rules.length - 1"
        :aria-label="$t('trackerLimitSettings.moveDown')"
        @click="moveRule(index, 1)"
      >
        <template #icon>
          <n-icon><ArrowDownOutline /></n-icon>
        </template>
      </n-button>
      <n-button quaternary circle :aria-label="$t('trackerLimitSettings.remove')" @click="removeRule(index)">
        <template #icon>
          <n-icon><TrashOutline /></n-icon>
        </template>
      </n-button>
      <n-text depth="3" class="rule-stats">
        {{ $t('trackerLimitSettings.liveStats', {
          count: ruleStats.get(rule.id)?.count || 0,
          upload: formatSpeed(ruleStats.get(rule.id)?.upload || 0),
          download: formatSpeed(ruleStats.get(rule.id)?.download || 0)
        }) }}
      </n-text>
    </div>

    <n-button dashed class="add-button" @click="addRule">
      <template #icon>
        <n-icon><AddCircleOutline /></n-icon>
      </template>
      {{ $t('trackerLimitSettings.add') }}
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSettingStore, type TrackerLimitRule } from '@/store/setting'
import { useTorrentStore } from '@/store'
import { formatSpeed } from '@/utils'
import { getTorrentTrackerSites, getTrackerSiteKey, matchesTrackerHost } from '@/store/torrentUtils'
import { AddCircleOutline, ArrowDownOutline, ArrowUpOutline, TrashOutline } from '@vicons/ionicons5'

const { t: $t } = useI18n()
const settingStore = useSettingStore()
const torrentStore = useTorrentStore()
const rules = computed(() => settingStore.setting.trackerLimitRules as TrackerLimitRule[])
const trackerOptions = computed(() =>
  torrentStore.trackerOptions
    .filter((item) => item.key !== 'all' && item.key !== 'noTracker')
    .map((item) => ({ label: item.label, value: item.key }))
)

function getTrackerOptions(currentIndex: number) {
  const selectedByOtherRules = new Set(
    rules.value
      .filter((rule, index) => index !== currentIndex && typeof rule?.pattern === 'string' && rule.pattern.trim())
      .map((rule) => getTrackerSiteKey(rule.pattern, settingStore.setting.ignoredTrackerPrefixes))
  )
  return trackerOptions.value.map((option) => ({
    ...option,
    disabled: selectedByOtherRules.has(option.value),
    label: selectedByOtherRules.has(option.value) ? `${option.label} · ${$t('trackerLimitSettings.configured')}` : option.label
  }))
}

const ruleStats = computed(() => {
  const stats = new Map<string, { count: number; upload: number; download: number }>()
  const ignoredPrefixes = settingStore.setting.ignoredTrackerPrefixes
  torrentStore.torrents.forEach((torrent) => {
    const sites = getTorrentTrackerSites(torrent, ignoredPrefixes)
    const ruleIndex = rules.value.findIndex((rule) => {
      if (!rule || !rule.enabled || typeof rule.pattern !== 'string' || !rule.pattern.trim()) {
        return false
      }
      const pattern = getTrackerSiteKey(rule.pattern, ignoredPrefixes)
      return matchesTrackerHost(sites, pattern)
    })
    if (ruleIndex < 0) {
      return
    }
    const rule = rules.value[ruleIndex]
    const current = stats.get(rule.id) || { count: 0, upload: 0, download: 0 }
    current.count += 1
    current.upload += torrent.rateUpload || 0
    current.download += torrent.rateDownload || 0
    stats.set(rule.id, current)
  })
  return stats
})

function addRule() {
  rules.value.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    pattern: '',
    uploadLimit: null,
    downloadLimit: null
  })
}

function removeRule(index: number) {
  rules.value.splice(index, 1)
}

function moveRule(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= rules.value.length) {
    return
  }
  const [rule] = rules.value.splice(index, 1)
  rules.value.splice(target, 0, rule)
}
</script>

<style scoped lang="less">
.empty-rule {
  color: var(--text-color-3);
  margin-bottom: 12px;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.pattern-input {
  flex: 1 1 220px;
  min-width: 150px;
}

.limit-input {
  width: 150px;
}

.add-button {
  margin-top: 4px;
}

.rule-stats {
  flex: 1 0 100%;
  padding-left: 28px;
  font-size: 12px;
}

@media (max-width: 640px) {
  .rule-row {
    align-items: flex-start;
  }

  .pattern-input {
    flex: 1 1 calc(100% - 44px);
  }

  .limit-input {
    flex: 1 1 140px;
  }
}
</style>
