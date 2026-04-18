import { computed } from 'vue'
import type { AutoCompleteOption, AutoCompleteGroupOption } from 'naive-ui'
import { useSettingStore, useTorrentStore } from '@/store'

export type DownloadDirOption = string | AutoCompleteOption | AutoCompleteGroupOption

/**
 * 统一计算下载目录联想选项
 *
 * - 自定义目录字典（customDownloadDirs）始终展示，置于列表顶部
 * - 历史下载目录由开关 enableDownloadDirSuggestions 控制
 * - 同一个目录优先以自定义字典中的标签呈现，避免重复
 */
export function useDownloadDirOptions() {
  const torrentStore = useTorrentStore()
  const settingStore = useSettingStore()

  const downloadDirOptions = computed<DownloadDirOption[]>(() => {
    const customDirs = (settingStore.setting.customDownloadDirs ?? [])
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)

    const seen = new Set<string>()
    const options: DownloadDirOption[] = []

    customDirs.forEach((dir) => {
      if (seen.has(dir)) {
        return
      }
      seen.add(dir)
      options.push({ label: dir, value: dir })
    })

    if (settingStore.setting.enableDownloadDirSuggestions !== false) {
      torrentStore.downloadDirOptions
        .filter((item: any) => item.key !== 'all')
        .forEach((item: any) => {
          const value = item.key as string
          if (!value || seen.has(value)) {
            return
          }
          seen.add(value)
          options.push({
            label: typeof item.label === 'string' ? item.label.replace(/（.*?）/, '') : value,
            value
          })
        })
    }

    return options
  })

  return {
    downloadDirOptions
  }
}
