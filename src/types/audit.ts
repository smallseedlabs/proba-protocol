/**
 * Audit trail types.
 *
 * Every Proba service emits an AuditEvent for every action or step it takes.
 * Producers send AuditEvents; the audit consumer stores them as
 * StoredAuditEvents (adding the hash chain). This module is I/O-free: it only
 * describes the shape of the data.
 *
 * Rules for `details` (documentation only, not enforced by validation):
 * - Never put secrets in `details`: no API keys, tokens, passwords, cookies,
 *   authorization headers or ad-platform credentials.
 * - Never put raw personal data in `details`: reference people and records by
 *   id (userId, target.id) rather than by name, email, phone or free text.
 * - Keep it small and structured; large payloads belong in their own store,
 *   referenced by id.
 */

export const AUDIT_EVENT_VERSION = 1;

export type AuditEventVersion = typeof AUDIT_EVENT_VERSION;

export type AuditActorType = 'user' | 'brain' | 'system' | 'service';

export type AuditCategory =
  | 'command'
  | 'brain'
  | 'tool'
  | 'policy'
  | 'approval'
  | 'data_access'
  | 'memory'
  | 'metrics'
  | 'auth'
  | 'config'
  | 'system';

export type AuditOutcome = 'success' | 'failure' | 'denied' | 'partial';

export type AuditRiskLevel = 'low' | 'medium' | 'high';

export interface AuditActor {
  type: AuditActorType;
  id: string;
}

export interface AuditTarget {
  type: string;
  id: string;
}

export interface AuditCost {
  tokensIn?: number;
  tokensOut?: number;
  /** ISO 4217 currency code, e.g. "USD". Present together with `amount`. */
  currency?: string;
  /** Monetary cost in major units of `currency`. Present together with `currency`. */
  amount?: number;
}

export interface AuditEvent {
  /** Schema version of this event. */
  version: AuditEventVersion;
  /** Producer-generated UUID; the consumer dedupes on it. */
  eventId: string;
  /**
   * UUID that ties together everything caused by one root. The root is the web
   * command's clientMsgId, or a job run id for background work.
   */
  traceId: string;
  /** Id of this step within the trace. */
  spanId: string;
  /** spanId of the step that caused this one; absent for the root span. */
  parentSpanId?: string;
  workspaceId: string;
  userId?: string;
  goalId?: string;
  threadId?: string;
  campaignId?: string;
  actor: AuditActor;
  /** Emitting service, e.g. "hub". */
  service: string;
  /** Dotted, lower-case action name, e.g. "command.received". */
  action: string;
  category: AuditCategory;
  target?: AuditTarget;
  outcome: AuditOutcome;
  errorCode?: string;
  errorMessage?: string;
  riskLevel?: AuditRiskLevel;
  cost?: AuditCost;
  durationMs?: number;
  /** ISO 8601 UTC timestamp of when the action happened (not when it was ingested). */
  occurredAt: string;
  /** Structured context. See the rules at the top of this file. */
  details: Record<string, unknown>;
  tags?: string[];
}

/**
 * An AuditEvent as stored by the audit consumer. Producers never set the
 * additional fields: the consumer assigns them when it appends the event to the
 * hash chain.
 */
export interface StoredAuditEvent extends AuditEvent {
  /** Hash of the previous stored event in the chain; null for the first event. */
  prevHash: string | null;
  /** Hash of this event (see canonicalizeAuditEvent for the canonical form). */
  hash: string;
  /** ISO 8601 UTC timestamp of when the consumer stored the event. */
  ingestedAt: string;
  /** Version of the storage schema the consumer used. */
  schemaVersion: number;
}
