/**
 * Audit trail utilities: type guard and canonical serialisation. The action
 * catalog lives in ./audit-actions.ts.
 */

import type { AuditContent, AuditEvent } from '../types/audit.js';
import { AUDIT_CONTENT_MAX_CHARS } from '../types/audit.js';
import type { MetricObservation } from '../types/metrics.js';
import { auditEventSchema } from '../schemas/audit.js';
import { metricObservationSchema } from '../schemas/metrics.js';

export function isAuditEvent(value: unknown): value is AuditEvent {
  return auditEventSchema.safeParse(value).success;
}

export function isMetricObservation(value: unknown): value is MetricObservation {
  return metricObservationSchema.safeParse(value).success;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortKeys(v);
    }
    return out;
  }
  return value;
}

/**
 * Canonical JSON for an audit event: object keys sorted recursively, array
 * order preserved, `undefined` values omitted, no whitespace. The audit
 * consumer hashes this string (together with prevHash) to build the chain.
 * The hash algorithm and the chaining rule are the consumer's decision and are
 * deliberately not implemented here.
 *
 * Pass the producer-supplied AuditEvent fields only (not prevHash, hash,
 * ingestedAt or schemaVersion).
 */
export function canonicalizeAuditEvent(event: AuditEvent): string {
  return JSON.stringify(sortKeys(event));
}

/**
 * Canonical JSON of an AuditContent (same rules as canonicalizeAuditEvent). The audit consumer
 * hashes this string with SHA-256 to get `StoredAuditEvent.contentDigest`.
 */
export function canonicalizeAuditContent(content: AuditContent): string {
  return JSON.stringify(sortKeys(content));
}

/**
 * Builds an AuditContent from text that already has its secrets masked: truncates it to
 * `maxChars` (default AUDIT_CONTENT_MAX_CHARS, never splitting a surrogate pair) and sets
 * `truncated`, `originalLength` and `redactions`. Masking itself is the producer's job.
 */
export function buildAuditContent(
  kind: string,
  maskedText: string,
  options: { redactions?: number; maxChars?: number } = {}
): AuditContent {
  const max = Math.min(options.maxChars ?? AUDIT_CONTENT_MAX_CHARS, AUDIT_CONTENT_MAX_CHARS);
  let text = maskedText;
  if (text.length > max) {
    let end = max;
    const last = text.charCodeAt(end - 1);
    if (last >= 0xd800 && last <= 0xdbff) end -= 1; // do not leave half of a surrogate pair
    text = text.slice(0, end);
  }
  return {
    kind,
    text,
    truncated: text.length < maskedText.length,
    originalLength: maskedText.length,
    redactions: options.redactions ?? 0,
  };
}
