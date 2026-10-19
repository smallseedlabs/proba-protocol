/**
 * Utility for generating idempotency keys.
 */

import { randomUUID } from 'crypto';

/**
 * Generates a UUID v4 idempotency key for command deduplication.
 * @returns A UUID string suitable for use as clientMsgId
 */
export function generateIdempotencyKey(): string {
  return randomUUID();
}

/**
 * Generates a time-based idempotency key with optional prefix.
 * Useful for debugging and tracking.
 * @param prefix Optional prefix for the key
 * @returns A time-based key with UUID suffix
 */
export function generateTimestampedKey(prefix?: string): string {
  const timestamp = Date.now();
  const uuid = randomUUID();
  return prefix ? `${prefix}-${timestamp}-${uuid}` : `${timestamp}-${uuid}`;
}
