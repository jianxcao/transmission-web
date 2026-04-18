import { useIsSmallScreen } from '@/composables/useIsSmallScreen'
import { defineStore } from 'pinia'

const useToolbarStore = defineStore('ListToolbar', () => {
  const isMobile = useIsSmallScreen()
  const listType = ref<string>(isMobile.value ? 'card' : 'table')
  // selectMode 不再依赖 isSupportTouch（PC 触屏设备会被误判为 touch）
  // 规则：
  //   - 表格视图：始终显示多选框（无论桌面 / 移动）
  //   - 卡片视图：隐藏多选框（默认场景为移动端 + 卡片）
  const selectMode = ref<boolean>(listType.value === 'table')

  watch(isMobile, (newVal) => {
    if (!newVal) {
      listType.value = 'table'
    }
  })

  // listType 变化时同步 selectMode：表格 -> 开启，卡片 -> 关闭
  // 用户仍可通过 ToolbarView 上的按钮在当前视图下手动切换
  watch(listType, (newType) => {
    selectMode.value = newType === 'table'
  })

  function setSelectMode(mode: boolean) {
    selectMode.value = mode
  }
  function setListType(type: string) {
    listType.value = type
  }
  return {
    selectMode,
    setSelectMode,
    listType,
    setListType
  }
})

export default useToolbarStore
