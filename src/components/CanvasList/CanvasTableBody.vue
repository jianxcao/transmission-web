<template>
  <div
    class="canvas-body-wrapper"
    :style="{ height: canvasHeight + 'px', width: containerWidth + 'px', top: tableStore.viewTop + 'px' }"
  >
    <canvas class="canvas-select" v-if="toolbarStore.selectMode" ref="bodyCanvasSelect"></canvas>
    <canvas class="canvas-body" ref="bodyCanvas"></canvas>
  </div>
  <RowMenu v-model:show="showDropdown" :x="rowMenuX" :y="rowMenuY" to="body" :id="rowMenuId" />
</template>
<script setup lang="ts">
import type { Torrent } from '@/api/rpc'
import checkboxCheckedIconUrl from '@/assets/icons/checkboxchecked.svg?raw'
import checkboxUncheckedIconUrl from '@/assets/icons/checkboxunchecked.svg?raw'
import { useSettingStore, useTorrentStore } from '@/store'
import { isMac } from '@/utils/index'
import type { AnyTouchEvent } from 'any-touch'
import { colord, extend } from 'colord'
import { useThemeVars } from 'naive-ui'
import BandwidthPriorityCell from './cells/BandwidthPriorityCell'
import ByteRateCell from './cells/ByteRateCell'
import ByteSizeCell from './cells/ByteSizeCell'
import DateCell from './cells/DateCell'
import DefaultCell from './cells/DefaultCell'
import FixedDecimal from './cells/FixedDecimal'
import IsPrivateCell from './cells/IsPrivateCell'
import LabelsCell from './cells/LabelsCell'
import NameCell from './cells/NameCell'
import PeersCell from './cells/PeersCell'
import PercentBarCell from './cells/PercentBarCell'
import PositiveNumberCell from './cells/PositiveNumberCell'
import SeedsCell from './cells/SeedsCell'
import StatusCell from './cells/StatusCell'
import TimeCell from './cells/TimeCell'
import UpDownRatioCell from './cells/UpDownRatioCell'
import { drawIcon, drawLine, getIconImg } from './cells/utils'
import { useTableStore } from './store/tableStore'
import useToolbarStore from './store/toolbarStore'
import { ITEM_HEIGHT } from './store/utils'
import mixPlugin from 'colord/plugins/mix'

// 扩展 colord 支持混合功能
extend([mixPlugin])

defineExpose({
  onMouseMove,
  onMouseLeave,
  onRowClick,
  onRowContextMenu,
  onKeyDown,
  handleLongtap
})
const tableStore = useTableStore()
const torrentStore = useTorrentStore()
const settingStore = useSettingStore()
const toolbarStore = useToolbarStore()
const filteredTorrents = computed(() => torrentStore.filterTorrents)
const mapSelectedKeys = computed(() => torrentStore.mapSelectedKeys)
const visibleColumns = computed(() => torrentStore.visibleColumns)
const canvasWidth = computed(() => torrentStore.tableMinWidth || 0)
const canvasHeight = computed(() => tableStore.clientHeight || 0)
const rowMenuX = ref(0)
const rowMenuY = ref(0)
const showDropdown = ref(false)

const containerWidth = computed(() => {
  return toolbarStore.selectMode ? canvasWidth.value + checkboxWidth : canvasWidth.value
})

// 开始渲染的偏移
const startY = computed(() => tableStore.startY)
const hoverRowIndex = ref<number | null>(null)
const theme = useThemeVars()
const themeMode = computed(() => settingStore.setting.theme)

const bodyCanvas = ref<HTMLCanvasElement | null>(null)
const bodyCanvasSelect = ref<HTMLCanvasElement | null>(null)
let rafId: number | null = null
const rowMenuId = ref<number | undefined>()

const tableColors = computed(() => {
  const mixedColor = themeMode.value === 'dark' ? '#ffffff00' : '#00000000'
  const oddColor = colord(theme.value.tableColorStriped).mix(mixedColor, 0.5).toRgbString()
  const mixedSelectedColor = themeMode.value === 'dark' ? '#00000000' : '#ffffff00'
  const selectedBgColor = colord(theme.value.primaryColor).mix(mixedSelectedColor, 0.3).toRgbString()
  return {
    selectedBgColor,
    oddColor
  }
})

const cellRender: Record<string, typeof DefaultCell> = {
  name: NameCell,
  labels: LabelsCell,
  // 总大小
  totalSize: ByteSizeCell,
  // 选定大小
  sizeWhenDone: ByteSizeCell,
  // 剩余
  leftUntilDone: ByteSizeCell,
  //有效
  haveValid: ByteSizeCell,
  // 已下载
  downloadedEver: ByteSizeCell,
  // 已上传
  uploadedEver: ByteSizeCell,
  // 上传下载比
  uploadedDownloaded: UpDownRatioCell,
  // 分享率
  uploadRatio: FixedDecimal,
  // 进度
  percentDone: PercentBarCell,
  // 下载速度
  rateDownload: ByteRateCell,
  // 上传速度
  rateUpload: ByteRateCell,
  // 状态
  status: StatusCell,
  // 添加时间
  addedDate: DateCell,
  // 种子|活跃
  peersSendingToUs: SeedsCell,
  // 下载|活跃
  peersGettingFromUs: PeersCell,
  // 剩余时间
  eta: TimeCell,
  // 完成时间
  doneDate: DateCell,
  // 最后活动时间
  activityDate: DateCell,
  // 优先级
  // bandwidthPriority: PriorityCell,
  queuePosition: PositiveNumberCell,
  // 做种时长
  secondsSeeding: TimeCell,
  // 文件数
  'file-count': PositiveNumberCell,
  // 块数
  pieceCount: PositiveNumberCell,
  // 元数据完成度
  metadataPercentComplete: PercentBarCell,
  isPrivate: IsPrivateCell,
  bandwidthPriority: BandwidthPriorityCell
}
const checkboxWidth = 24
const updateSize = () => {
  const dpr = window.devicePixelRatio || 1
  const height = canvasHeight.value
  if (bodyCanvas.value) {
    bodyCanvas.value.width = canvasWidth.value * dpr
    bodyCanvas.value.height = height * dpr
    bodyCanvas.value.style.width = canvasWidth.value + 'px'
    bodyCanvas.value.style.height = height + 'px'
  }
  if (bodyCanvasSelect.value) {
    bodyCanvasSelect.value.width = checkboxWidth * dpr
    bodyCanvasSelect.value.height = height * dpr
    bodyCanvasSelect.value.style.width = checkboxWidth + 'px'
    bodyCanvasSelect.value.style.height = height + 'px'
  }
}

function drawCells(ctx: CanvasRenderingContext2D, row: Torrent, rowHeight: number, y: number) {
  let x = tableStore.startX
  for (let i = tableStore.visibleStartCol; i <= tableStore.visibleEndCol; i++) {
    const col = visibleColumns.value[i]
    const render = cellRender[col.key] || DefaultCell
    render(ctx, row, col, {
      x: x,
      y: y,
      rowHeight: rowHeight
    })
    x += col.width
  }
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  index: number,
  // 0 normal, 1 selected, 2 hovered
  status: number = 0,
  isEmpty: boolean = false,
  isClean: boolean = false
) {
  const canvas = bodyCanvas.value
  if (!canvas) {
    return
  }
  const row = filteredTorrents.value[index]
  if (!row) {
    return
  }
  ctx.save()
  const dpr = window.devicePixelRatio || 1
  ctx.scale(dpr, dpr)
  const heights = tableStore.cumulativeHeights.heights
  const mapRowHeights = tableStore.cumulativeHeights.mapRowHeights
  const currentRowHeight = tableStore.cumulativeHeights.mapRowHeights.get(row.id) || ITEM_HEIGHT
  const startRow = filteredTorrents.value[tableStore.visibleStart]
  const y =
    heights[index] -
    heights[tableStore.visibleStart] +
    startY.value +
    (mapRowHeights.get(startRow.id) || 0) -
    currentRowHeight
  if (isClean) {
    ctx.clearRect(0, y, canvasWidth.value, currentRowHeight)
  }
  let bgColor: string | undefined = undefined
  if (status === 0 && index % 2 !== 0) {
    bgColor = tableColors.value.oddColor
  } else if (status === 1) {
    bgColor = tableColors.value.selectedBgColor
  } else if (status === 2) {
    bgColor = theme.value.tableColorHover
  }
  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, y, canvasWidth.value, currentRowHeight)
  }
  drawLine(ctx, theme.value.borderColor, 0, y + currentRowHeight, canvasWidth.value, y + currentRowHeight)
  if (!isEmpty) {
    drawCells(ctx, row, currentRowHeight, y)
    ctx.font = `${theme.value.fontSize} ${theme.value.fontFamily} `
    ctx.fillStyle = theme.value.textColorBase
    ctx.textBaseline = 'middle'
  }
  ctx.restore()
}

const checkboxCheckedIcon = computed(() =>
  getIconImg(checkboxCheckedIconUrl, 'checkboxChecked', theme.value.primaryColor)
)
const checkboxUncheckedIcon = computed(() =>
  getIconImg(checkboxUncheckedIconUrl, 'checkboxUnchecked', theme.value.primaryColor)
)

function drawCheckboxRow(ctx: CanvasRenderingContext2D, index: number, status: number, isClean?: boolean) {
  const canvas = bodyCanvasSelect.value
  if (!canvas) {
    return
  }
  const row = filteredTorrents.value[index]
  ctx.save()
  const dpr = window.devicePixelRatio || 1
  ctx.scale(dpr, dpr)
  const heights = tableStore.cumulativeHeights.heights
  const mapRowHeights = tableStore.cumulativeHeights.mapRowHeights
  const currentRowHeight = tableStore.cumulativeHeights.mapRowHeights.get(row.id) || ITEM_HEIGHT
  const startRow = filteredTorrents.value[tableStore.visibleStart]
  const y =
    heights[index] -
    heights[tableStore.visibleStart] +
    startY.value +
    (mapRowHeights.get(startRow.id) || 0) -
    currentRowHeight
  if (isClean) {
    ctx.clearRect(0, y, canvasWidth.value, currentRowHeight)
  }
  let bgColor: string | undefined = undefined
  if (status === 0 && index % 2 !== 0) {
    bgColor = tableColors.value.oddColor
  } else if (status === 1) {
    bgColor = tableColors.value.selectedBgColor
  } else if (status === 2) {
    bgColor = theme.value.tableColorHover
  }
  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, y, checkboxWidth, currentRowHeight)
  }
  const isChecked = torrentStore.mapSelectedKeys[row.id]
  drawLine(ctx, theme.value.borderColor, 0, y + currentRowHeight, checkboxWidth, y + currentRowHeight)
  drawIcon(
    ctx,
    isChecked ? checkboxCheckedIcon.value : checkboxUncheckedIcon.value,
    0,
    y + currentRowHeight / 2 - 12,
    24
  )
  ctx.restore()
}

function drawBody() {
  const canvas = bodyCanvas.value
  if (!canvas) {
    return
  }
  const dpr = window.devicePixelRatio || 1
  const ctx = canvas.getContext('2d')!
  const checkCtx = bodyCanvasSelect.value?.getContext('2d')!
  if (checkCtx) {
    checkCtx.clearRect(0, 0, checkboxWidth * dpr, canvasHeight.value * dpr)
  }
  // 清空画布
  ctx.clearRect(0, 0, canvasWidth.value * dpr, canvasHeight.value * dpr)
  const visibleStart = tableStore.visibleStart
  const visibleEnd = tableStore.visibleEnd
  const startIdx = tableStore.renderStartIdx
  const endIdx = tableStore.renderEndIdx
  for (let i = startIdx; i <= endIdx; i++) {
    const row = filteredTorrents.value[i]
    if (!row) {
      break
    }
    let status = 0
    if (mapSelectedKeys.value[row.id]) {
      status = 1
    } else if (hoverRowIndex.value === i) {
      status = 2
    }
    // buffersize 的行绘制了一个空的行，用于缓冲
    drawRow(ctx, i, status, i < visibleStart || i > visibleEnd, false)
    drawCheckboxRow(checkCtx, i, status, false)
  }
}

function getRowIndex(e: MouseEvent | AnyTouchEvent) {
  const wrapper = e.target as HTMLElement
  const rect = wrapper.getBoundingClientRect()
  const clickY = 'clientY' in e ? e.clientY : e.y
  const clickX = 'clientX' in e ? e.clientX : e.x
  const offsetY = clickY - rect.top - tableStore.viewTop
  const offsetX = clickX - rect.left
  const heights = tableStore.cumulativeHeights.heights
  let left = 0
  let right = heights.length - 1
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (offsetY < heights[mid]) {
      right = mid - 1
    } else {
      left = mid + 1
    }
  }
  if (left < heights.length) {
    return [left, offsetX, offsetY]
  }
  return [null, offsetX, offsetY]
}

function onMouseMove(e: MouseEvent) {
  const [rowIndex] = getRowIndex(e)
  if (rowIndex === null) {
    return
  }
  if (tableStore.visibleStart <= rowIndex && rowIndex <= tableStore.visibleEnd) {
    const row = filteredTorrents.value[rowIndex]
    if (row) {
      hoverRowIndex.value = rowIndex
      scheduleDraw(false)
    }
  }
}

function onMouseLeave() {
  hoverRowIndex.value = null
  scheduleDraw(false)
}

function onRowClick(e: any) {
  const [rowIndex, offsetX] = getRowIndex(e)
  if (showDropdown.value || rowIndex === null) {
    showDropdown.value = false
    return
  }
  if (tableStore.visibleStart <= rowIndex && rowIndex <= tableStore.visibleEnd) {
    const row = filteredTorrents.value[rowIndex]
    if (!row) {
      return
    }
    const isCtrl = e.ctrlKey
    const isCmd = e.metaKey
    const isShift = e.shiftKey
    const isCheckbox = offsetX !== null && offsetX < checkboxWidth
    if (isShift) {
      // shift 连选时，无论当前行是否已选中，都以该行为新的终点重新计算范围
      torrentStore.selectRange(rowIndex)
    } else if ((isMac() && isCmd) || (!isMac && isCtrl)) {
      torrentStore.toggleSelectedKey(row.id)
    } else {
      if (e.pointerType === 'touch' || isCheckbox) {
        torrentStore.toggleSelectedKey(row.id)
      } else {
        torrentStore.setSelectedKeys([row.id])
      }
    }
  }
}

function onRowContextMenu(e: MouseEvent) {
  e.preventDefault()
  const [rowIndex] = getRowIndex(e)
  if (rowIndex === null || e.ctrlKey) {
    return
  }
  if (tableStore.visibleStart <= rowIndex && rowIndex <= tableStore.visibleEnd) {
    const row = filteredTorrents.value[rowIndex]
    if (row && !mapSelectedKeys.value[row.id]) {
      torrentStore.setSelectedKeys([row.id])
    }
    if (row) {
      rowMenuId.value = row.id
      showDropdown.value = true
      rowMenuX.value = e.clientX
      rowMenuY.value = e.clientY
      // console.debug('onRowContextMenu', e.clientX, e.clientY)
    }
  }
}

function handleLongtap(e: AnyTouchEvent) {
  const [rowIndex] = getRowIndex(e)
  if (rowIndex === null) {
    return
  }
  if (tableStore.visibleStart <= rowIndex && rowIndex <= tableStore.visibleEnd) {
    const row = filteredTorrents.value[rowIndex]
    if (row) {
      rowMenuId.value = row.id
      showDropdown.value = true
      rowMenuX.value = e.x
      rowMenuY.value = e.y
    }
  }
}

function onKeyDown(event: KeyboardEvent) {
  event.preventDefault()
  const isCmdOrCtrl = isMac() ? event.metaKey : event.ctrlKey
  const isKeyA = event.key.toLowerCase() === 'a' // 忽略大小写
  if (isCmdOrCtrl && isKeyA) {
    event.preventDefault()
    torrentStore.setSelectedKeys(filteredTorrents.value.map((t) => t.id))
  }
}

onMounted(() => {
  nextTick(() => {
    updateSize()
    drawBody()
  })
})

function scheduleDraw(isResize: boolean = false) {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  rafId = requestAnimationFrame(() => {
    if (isResize) {
      updateSize()
    }
    // const d = performance.now()
    drawBody()
    // console.debug(
    //   'drawBody',
    //   performance.now() - d + 'ms',
    //   'draw Rows: ',
    //   tableStore.visibleEnd - tableStore.visibleStart
    // )
    rafId = null
  })
}

// 合并渲染触发器，避免多个独立的 watch
const renderTriggers = computed(() => ({
  // 布局相关
  clientHeight: tableStore.clientHeight,
  clientWidth: tableStore.clientWidth,
  tableMinWidth: torrentStore.tableMinWidth,
  visibleColumns: torrentStore.visibleColumns.length,

  // 数据相关
  torrentCount: torrentStore.filterTorrents.length,
  selectedCount: torrentStore.selectedKeys.length,
  visibleStart: tableStore.visibleStart,
  scrollTop: tableStore.scrollTop,
  scrollLeft: tableStore.scrollLeft,
  // 主题相关
  themeId: settingStore.setting.theme,
  selectMode: toolbarStore.selectMode,
  singleLine: settingStore.setting.singleLine
}))

// 替换多个 watch 为单个合并的 watch
watch(
  renderTriggers,
  (newVal, oldVal) => {
    let needsResize = false

    // 检查是否需要重新计算尺寸
    if (
      newVal.clientHeight !== oldVal?.clientHeight ||
      newVal.clientWidth !== oldVal?.clientWidth ||
      newVal.tableMinWidth !== oldVal?.tableMinWidth ||
      newVal.visibleColumns !== oldVal?.visibleColumns ||
      newVal.selectMode !== oldVal?.selectMode ||
      newVal.singleLine !== oldVal?.singleLine
    ) {
      needsResize = true
    }

    scheduleDraw(needsResize)
  },
  { flush: 'post' }
)

watch(
  [
    () => tableStore.clientHeight,
    () => tableStore.clientWidth,
    () => tableStore.scrollTop,
    () => tableStore.scrollLeft
  ],
  () => {
    showDropdown.value = false
  }
)
</script>

<style lang="less" scoped>
@import '@/styles/mix.less';
.canvas-body-wrapper {
  display: flex;
  flex-direction: row;
  z-index: 1;
  position: sticky;
  top: 0;
  left: 0;
}
.canvas-body {
  transform: translateZ(0);
  will-change: transform;
}
.canvas-select {
  position: sticky;
  left: 0;
  z-index: 1000;
  width: 20px;
  background-color: var(--table-color);
  box-shadow: -10px 0px 20px 0px var(--border-color);
  transform: translateZ(0);
  will-change: transform;
}
</style>
