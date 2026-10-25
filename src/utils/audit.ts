/**
 * Audit trail utilities: type guard, canonical serialisation and recommended
 * action names.
 */

import type { AuditCategory, AuditEvent } from '../types/audit.js';
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
 * Recommended action names per category. Not exhaustive and not enforced:
 * validation only requires the dotted lower-case shape, so services may add
 * their own actions.
 */
export const AUDIT_ACTIONS = {
  command: ['command.received', 'command.accepted', 'command.rejected', 'command.processed', 'command.duplicate'],
  brain: ['brain.llm_call', 'brain.plan_created', 'brain.clarify_requested', 'brain.decision_made', 'brain.error'],
  tool: ['tool.called', 'tool.completed', 'tool.failed'],
  policy: ['policy.evaluated', 'policy.allowed', 'policy.denied'],
  approval: ['approval.requested', 'approval.granted', 'approval.rejected', 'approval.expired'],
  data_access: ['data_access.read', 'data_access.write', 'data_access.export'],
  memory: ['memory.read', 'memory.write', 'memory.delete'],
  metrics: ['metrics.fetch_started', 'metrics.fetch_completed', 'metrics.fetch_failed', 'metrics.observation_stored'],
  auth: ['auth.sign_in', 'auth.sign_out', 'auth.session_issued', 'auth.session_revoked', 'auth.denied'],
  config: ['config.changed', 'config.loaded'],
  system: ['system.started', 'system.stopped', 'system.job_run', 'system.error'],
} as const satisfies Record<AuditCategory, readonly string[]>;
