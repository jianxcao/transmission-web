import type { Torrent } from '@/api/rpc'
import type { ColumnConfig } from '@/composables/useColumns'
import { PADDING_X } from '../store/utils'
import { roundRect, roundRectLeft } from './utils'
import { useSettingStore } from '@/store'

export default function renderPercentBarCell(
  ctx: CanvasRenderingContext2D,
  row: Torrent,
  col: ColumnConfig,
  state: { x: number; y: number; rowHeight: number }
) {
  ctx.save()
  const settingStore = useSettingStore()
  const value = Number(row[col.key as keyof Torrent])
  const { x, y, rowHeight } = state
  const width = col.width - PADDING_X * 2
  const height = Math.min(22, rowHeight - 4)
  const barRadius = height / 3
  const barX = x + PADDING_X
  const barY = y + (rowHeight - height) / 2
  let percent = Math.round(value * 100)
  // 目前 返回的数据中percentDone在下载的时候一直是 0
  const sizeWhenDone = Number(row.sizeWhenDone)
  const downloadedEver = Number(row.downloadedEver)
  if (downloadedEver > 0) {
    percent = Math.max(percent, Math.min(Math.round((downloadedEver / sizeWhenDone) * 100), 100))
  }
  percent = Math.min(Math.max(percent, 0), 100)
  const percentWidth = Math.max((width * percent) / 100, 0)
  const active = row.rateDownload > 0 || row.rateUpload > 0
  const theme = settingStore.themeVars
  // 颜色
  const bgColor = theme.dividerColor || '#3a3a3a' // 未完成部分
  const barColor = active
    ? theme.primaryColor // 已完成部分
    : theme.primaryColorSuppl
  const textColor = theme.textColorBase // 百分比文本为黑色

  // 绘制背景（未完成部分）
  ctx.beginPath()
  roundRect(ctx, barX, barY, width, height, barRadius)
  ctx.fillStyle = bgColor
  ctx.fill()

  // 绘制进度条（已完成部分）
  ctx.beginPath()
  if (percent >= 100) {
    roundRect(ctx, barX, barY, percentWidth, height, barRadius)
  } else {
    roundRectLeft(ctx, barX, barY, percentWidth, height, barRadius)
  }
  ctx.fillStyle = barColor
  ctx.fill()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = textColor
  ctx.fillText(`${percent}%`, barX + width / 2, barY + height / 2)
  ctx.restore()
}
