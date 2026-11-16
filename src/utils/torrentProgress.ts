import type { Torrent } from '@/api/rpc'
import { Status } from '@/types/tr'

export const clampProgress = (value: number) => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1)

/**
 * 判断种子任务是否已真正完成下载。
 */
export function isTorrentComplete(torrent: Torrent): boolean {
  const sizeWhenDone = Number(torrent.sizeWhenDone)
  const leftUntilDone = Number(torrent.leftUntilDone)
  if (Number.isFinite(leftUntilDone) && leftUntilDone > 0) {
    return false
  }
  if (Number.isFinite(sizeWhenDone) && sizeWhenDone > 0 && Number.isFinite(leftUntilDone)) {
    return leftUntilDone === 0
  }
  return clampProgress(Number(torrent.percentDone)) >= 1
}

/**
 * 返回列表中实际展示的任务进度（0~1）。
 *
 * 校验任务使用 recheckProgress；其他任务优先使用 percentDone，
 * 仅在 percentDone 为 0 时兜底兼容部分异常服务端。
 */
export function getTorrentProgress(torrent: Torrent): number {
  if (torrent.status === Status.queuedToVerify || torrent.status === Status.verifying) {
    return clampProgress(Number(torrent.recheckProgress))
  }

  const percentDone = clampProgress(Number(torrent.percentDone))
  const sizeWhenDone = Number(torrent.sizeWhenDone)
  const leftUntilDone = Number(torrent.leftUntilDone)

  if (percentDone > 0) {
    // 若仍有未下载完成的字节，避免进度值直接达到 1
    if (Number.isFinite(leftUntilDone) && leftUntilDone > 0 && percentDone >= 1) {
      return 0.9999
    }
    return percentDone
  }

  if (sizeWhenDone > 0) {
    let fallbackProgress = 0
    if (Number.isFinite(leftUntilDone)) {
      fallbackProgress = clampProgress((sizeWhenDone - Math.max(0, leftUntilDone)) / sizeWhenDone)
    } else {
      const downloadedEver = Number(torrent.downloadedEver)
      if (downloadedEver > 0) {
        fallbackProgress = clampProgress(downloadedEver / sizeWhenDone)
      }
    }
    if (Number.isFinite(leftUntilDone) && leftUntilDone > 0 && fallbackProgress >= 1) {
      return 0.9999
    }
    return fallbackProgress
  }

  return percentDone
}

/**
 * 将 0~1 的进度转换为 0~100 的整数百分比。
 * 未完成时不会因为四舍五入而显示为 100%。
 */
export function getProgressPercent(progress: number, isComplete?: boolean): number {
  const clamped = clampProgress(progress)
  const completed = isComplete !== undefined ? isComplete && clamped >= 1 : clamped >= 1
  if (completed) {
    return 100
  }
  return Math.min(99, Math.floor(clamped * 100))
}

/**
 * 将 0~1 的进度格式化为固定小数位的百分比字符串（不含 %）。
 * 未完成时不会因为四舍五入而显示为 100.0%。
 */
export function getProgressPercentFixed(progress: number, digits = 1, isComplete?: boolean): string {
  const clamped = clampProgress(progress)
  const completed = isComplete !== undefined ? isComplete && clamped >= 1 : clamped >= 1
  if (completed) {
    return (100).toFixed(digits)
  }
  const factor = 10 ** digits
  const maxVal = (100 * factor - 1) / factor
  return Math.min(maxVal, Math.floor(clamped * 100 * factor) / factor).toFixed(digits)
}
