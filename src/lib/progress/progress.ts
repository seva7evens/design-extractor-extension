import type { ProgressEvent } from '@/lib/extraction/types';

export function progress(step: string, message = step): ProgressEvent {
  return { step, message, at: new Date().toISOString() };
}

export function lastEvents(events: ProgressEvent[], event: ProgressEvent, limit = 3): ProgressEvent[] {
  return [...events, event].slice(-limit);
}
