/**
 * Builder functions for creating audit events.
 */

import { randomBytes } from 'crypto';
import type { AuditEvent } from '../types/audit.js';
import { AUDIT_EVENT_VERSION } from '../types/audit.js';
import { generateIdempotencyKey } from '../utils/idempotency.js';

/**
 * Fields a producer must supply. eventId, spanId, occurredAt, version, details
 * and tags have defaults (see buildAuditEvent).
 */
export type AuditEventDraft = Omit<AuditEvent, 'version' | 'eventId' | 'spanId' | 'occurredAt' | 'details'> &
  Partial<Pick<AuditEvent, 'version' | 'eventId' | 'spanId' | 'occurredAt' | 'details'>>;

/** Generates a 16-hex-character span id. */
export function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Builds an AuditEvent, filling defaults: version 1, a fresh eventId (UUID v4),
 * a fresh spanId, occurredAt = now and details = {}. Explicit values win. The
 * result is not validated; pass it to validateAuditEvent if needed.
 */
export function buildAuditEvent(draft: AuditEventDraft): AuditEvent {
  return {
    ...draft,
    version: draft.version ?? AUDIT_EVENT_VERSION,
    eventId: draft.eventId ?? generateIdempotencyKey(),
    spanId: draft.spanId ?? generateSpanId(),
    occurredAt: draft.occurredAt ?? new Date().toISOString(),
    details: draft.details ?? {},
  };
}
