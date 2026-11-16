export interface EtaInput {
  eta?: number | null
  leftUntilDone?: number
  rateDownload?: number
  metadataPercentComplete?: number
}

/**
 * 计算下载剩余时间（秒）。
 * 已完成返回 0；元数据未就绪或服务端无法估算时返回 Number.POSITIVE_INFINITY。
 */
export function getEtaSeconds({ eta, leftUntilDone, rateDownload = 0, metadataPercentComplete }: EtaInput): number {
  if (metadataPercentComplete != null && metadataPercentComplete < 1) {
    return Number.POSITIVE_INFINITY
  }
  if (leftUntilDone === 0) {
    return 0
  }
  if (eta != null) {
    const etaSeconds = Number(eta)
    if (Number.isFinite(etaSeconds)) {
      // -1（不可用）和 -2（未知）是服务端明确返回的状态，不能用瞬时速度覆盖。
      if (etaSeconds < 0) {
        return Number.POSITIVE_INFINITY
      }
      return etaSeconds === 0 && leftUntilDone != null && leftUntilDone > 0 ? 1 : etaSeconds
    }
  }
  if (
    leftUntilDone != null &&
    Number.isFinite(leftUntilDone) &&
    leftUntilDone > 0 &&
    Number.isFinite(rateDownload) &&
    rateDownload > 0
  ) {
    return leftUntilDone / rateDownload
  }
  return Number.POSITIVE_INFINITY
}
