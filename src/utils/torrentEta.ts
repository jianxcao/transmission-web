export interface EtaInput {
  eta?: number | null
  leftUntilDone?: number
  rateDownload?: number
}

/**
 * 计算下载剩余时间（秒）。
 * 已完成返回 0；无 ETA 且无下载速度时返回 Number.POSITIVE_INFINITY。
 */
export function getEtaSeconds({ eta, leftUntilDone = 0, rateDownload = 0 }: EtaInput): number {
  if (leftUntilDone <= 0) {
    return 0
  }
  if (eta != null) {
    const etaSeconds = Number(eta)
    if (Number.isFinite(etaSeconds) && etaSeconds >= 0) {
      return etaSeconds
    }
  }
  if (Number.isFinite(rateDownload) && rateDownload > 0) {
    return leftUntilDone / rateDownload
  }
  return Number.POSITIVE_INFINITY
}
