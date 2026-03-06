import type { AnalyticsEvent } from '@copia/types';

const eventLog: AnalyticsEvent[] = [];

/**
 * Emit an analytics event.
 * In the prototype, this logs to the console and stores in memory.
 * In production, this would forward to an analytics adapter (e.g., Segment, Posthog).
 */
export function emitEvent(event: AnalyticsEvent): void {
  eventLog.push(event);
  console.log(
    `[analytics] ${event.type}`,
    JSON.stringify(event, null, 2),
  );
}

/**
 * Retrieve the full event log for this session.
 */
export function getEventLog(): AnalyticsEvent[] {
  return [...eventLog];
}

/**
 * Clear the event log. Useful for testing.
 */
export function clearEventLog(): void {
  eventLog.length = 0;
}

/**
 * Adapter interface for production analytics.
 * Implementations should handle batching, retry, and transport.
 */
export interface AnalyticsAdapter {
  send(event: AnalyticsEvent): Promise<void>;
  flush(): Promise<void>;
}
