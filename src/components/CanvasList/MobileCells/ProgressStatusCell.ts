import { getStatusString } from '@/types/tr'
import type { ThemeCommonVars } from 'naive-ui'
import { fitText, getTextWidth, roundRect } from '../cells/utils'
import { MOBILE_LINE_MARGIN, MOBILE_PROGRESS_HEIGHT } from '../store/mobileUtils'
import type { MobileCellComponent, MobileCellHeightCalculator, MobileCellRenderer } from './types'
import { rowDark } from 'naive-ui/es/legacy-grid/styles'

// 获取状态颜色和背景色
function getStatusColors(
  status: number,
  error: boolean,
  theme: any
): { bgColor: string; textColor: string; borderColor: string } {
  if (error) {
    return {
      bgColor: `color-mix(in srgb, ${theme.errorColor} 15%, transparent)`,
      textColor: theme.errorColor,
      borderColor: theme.errorColor
    }
  }
  switch (status) {
    case 0: // 已暂停
      return {
        bgColor: `color-mix(in srgb, #888 15%, transparent)`,
        textColor: '#888',
        borderColor: '#888'
      }
    case 1: // 等待验证
    case 2: // 验证中
    case 3: // 等待下载
    case 5: // 等待做种
      return {
        bgColor: `color-mix(in srgb, #3bc9db 15%, transparent)`,
        textColor: '#3bc9db',
        borderColor: '#3bc9db'
      }
    case 4: // 下载中
      return {
        bgColor: `color-mix(in srgb, #748ffc 15%, transparent)`,
        textColor: '#748ffc',
        borderColor: '#748ffc'
      }
    case 6: // 做种中
      return {
        bgColor: `color-mix(in srgb, #10b981 15%, transparent)`,
        textColor: '#10b981',
        borderColor: '#10b981'
      }
    default:
      return {
        bgColor: `color-mix(in srgb, ${theme.textColor2} 15%, transparent)`,
        textColor: theme.textColor2,
        borderColor: theme.textColor2
      }
  }
}

// 绘制进度条（不含文字）
function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  progress: number,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: any
) {
  // 背景
  ctx.fillStyle = theme.borderColor
  roundRect(ctx, x, y, width, height, height / 2)
  ctx.fill()

  // 进度
  if (progress > 0) {
    ctx.fillStyle = theme.primaryColor
    roundRect(ctx, x, y, width * progress, height, height / 2)
    ctx.fill()
  }
}

// 绘制进度百分比文字（在指定区域内右对齐）
function drawProgressText(
  ctx: CanvasRenderingContext2D,
  progress: number,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: ThemeCommonVars
) {
  const progressText = `${(progress * 100).toFixed(1)}%`
  ctx.font = `${theme.fontSizeMedium} ${theme.fontFamily}`
  ctx.fillStyle = theme.textColorBase
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'

  // 在分配的区域内右对齐显示，留一点边距
  ctx.fillText(progressText, x + width - 4, y + height / 2)
  ctx.textAlign = 'start'
  ctx.textBaseline = 'top'
}

// 绘制状态标签（在指定区域内右对齐）
function drawStatusTag(
  ctx: CanvasRenderingContext2D,
  status: number,
  error: boolean,
  x: number,
  y: number,
  width: number,
  tagHeight: number,
  theme: any
) {
  let statusText = getStatusString(status) || '-'
  const colors = getStatusColors(status, error, theme)

  const tagPadding = 6
  const fontSize = 10

  ctx.font = `${fontSize}px ${theme.fontFamily}`
  const textWidth = getTextWidth(ctx, statusText)
  const tagWidth = Math.min(textWidth + tagPadding * 2, width - 8) // 确保标签不超出分配区域，留8px边距
  if (tagWidth > width) {
    statusText = fitText(ctx, statusText, width - 8, tagHeight, false) as string
  }
  // 在分配区域内右对齐，留一点边距
  const tagX = x + width - tagWidth - 4

  // 绘制标签背景
  ctx.fillStyle = colors.bgColor
  roundRect(ctx, tagX, y, tagWidth, tagHeight, tagHeight / 2)
  ctx.fill()

  // 绘制标签边框
  ctx.strokeStyle = colors.borderColor
  ctx.lineWidth = 1
  roundRect(ctx, tagX, y, tagWidth, tagHeight, tagHeight / 2)
  ctx.stroke()

  // 绘制标签文本
  ctx.fillStyle = colors.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(statusText, tagX + tagWidth / 2, y + tagHeight / 2)
  ctx.textAlign = 'start'
  ctx.textBaseline = 'top'

  return tagWidth
}

// 高度计算函数
const calculateHeight: MobileCellHeightCalculator = () => {
  return MOBILE_PROGRESS_HEIGHT + MOBILE_LINE_MARGIN * 2
}

// 渲染函数
const render: MobileCellRenderer = ({ ctx, row, state, theme }) => {
  const progressTextWidth = 55
  const statusTagWidth = 110
  const progressBarWidth = state.width - progressTextWidth - statusTagWidth
  // 计算各部分的X坐标
  const progressBarX = state.x
  const progressTextX = state.x + progressBarWidth
  const statusTagX = state.x + progressBarWidth + progressTextWidth
  // 限制 percentDone 在 0-1 范围内
  const percentDone = Math.min(Math.max(row.percentDone, 0), 1)

  // 绘制进度条
  drawProgressBar(
    ctx,
    percentDone,
    progressBarX,
    state.y + (MOBILE_PROGRESS_HEIGHT - 4) / 2,
    progressBarWidth,
    4,
    theme
  )

  // 绘制百分比文字（在分配的区域内居中）
  drawProgressText(ctx, percentDone, progressTextX, state.y, progressTextWidth, MOBILE_PROGRESS_HEIGHT, theme)

  // 绘制状态标签
  const tagY = state.y + (MOBILE_PROGRESS_HEIGHT - 18) / 2 // 18是标签高度，居中对齐
  drawStatusTag(ctx, row.status, !!row.error || !!row.cachedError, statusTagX, tagY, statusTagWidth, 18, theme)
}

// 第四行：进度条和状态
export const ProgressStatusCell: MobileCellComponent = {
  name: 'ProgressStatusCell',
  calculateHeight,
  render
}
