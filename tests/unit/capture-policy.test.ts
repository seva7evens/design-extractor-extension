import { isCaptureQuotaError, nextCaptureDelay } from '../../src/lib/screenshot/capture-policy';

it('paces captureVisibleTab calls below browser quota', () => {
  expect(nextCaptureDelay(1200, 1000, 650)).toBe(450);
  expect(nextCaptureDelay(1700, 1000, 650)).toBe(0);
});

it('detects Chrome capture quota errors', () => {
  expect(isCaptureQuotaError(new Error('This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.'))).toBe(true);
  expect(isCaptureQuotaError(new Error('Other error'))).toBe(false);
});
