import type { Torrent } from '@/api/rpc'
import type { ColumnConfig } from '@/composables/useColumns'
import { formatEta, timeToStr } from '@/utils/index'
import { PADDING_X } from '../store/utils'
import { drawText } from './utils'

export default function render(
  ctx: CanvasRenderingContext2D,
  row: Torrent,
  col: ColumnConfig,
  state: { x: number; y: number; rowHeight: number }
) {
  ctx.save()
  if (col.key === 'eta') {
    const displayText = formatEta(Number(row.eta), row.leftUntilDone, row.rateDownload)
    drawText(ctx, displayText, state.x + col.width - PADDING_X, state.y, col.width, state.rowHeight, 'end')
    ctx.restore()
    return
  }
  const value = Number(row[col.key as keyof Torrent])
  const d = isNaN(value) ? '' : timeToStr(value)
  const displayText = d === 'Invalid Date' ? '' : d
  drawText(ctx, displayText, state.x + col.width - PADDING_X, state.y, col.width, state.rowHeight, 'end')
  ctx.restore()
}
