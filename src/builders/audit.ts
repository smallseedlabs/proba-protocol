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

/** Generates an OpenTelemetry-style span id: 16 lowercase hex characters, never all zeros. */
export function generateSpanId(): string {
  let id = randomBytes(8).toString('hex');
  while (id === '0000000000000000') id = randomBytes(8).toString('hex');
  return id;
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
