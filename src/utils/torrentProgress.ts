import type { Torrent } from '@/api/rpc'
import { Status } from '@/types/tr'

const clampProgress = (value: number) => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1)

/**
 * 返回列表中实际展示的任务进度。
 *
 * 校验任务使用 recheckProgress；其他任务优先使用 percentDone，并兼容部分
 * Transmission 服务端 percentDone 始终为 0 的情况。
 */
export function getTorrentProgress(torrent: Torrent): number {
  if (torrent.status === Status.queuedToVerify || torrent.status === Status.verifying) {
    return clampProgress(Number(torrent.recheckProgress))
  }

  const percentDone = clampProgress(Number(torrent.percentDone))
  const sizeWhenDone = Number(torrent.sizeWhenDone)
  const downloadedEver = Number(torrent.downloadedEver)
  if (sizeWhenDone > 0 && downloadedEver > 0) {
    return Math.max(percentDone, clampProgress(downloadedEver / sizeWhenDone))
  }

  return percentDone
}
