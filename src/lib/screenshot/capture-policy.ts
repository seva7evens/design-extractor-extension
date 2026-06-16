export const CAPTURE_VISIBLE_TAB_MIN_INTERVAL_MS = 650;

export function nextCaptureDelay(now: number, lastCaptureAt: number, minInterval = CAPTURE_VISIBLE_TAB_MIN_INTERVAL_MS): number {
  return Math.max(0, minInterval - (now - lastCaptureAt));
}

export function isCaptureQuotaError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND');
}
