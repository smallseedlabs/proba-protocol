/**
 * Audit trail types.
 *
 * Every Proba service emits an AuditEvent for every action or step it takes.
 * Producers send AuditEvents; the audit consumer stores them as
 * StoredAuditEvents (adding the hash chain). This module is I/O-free: it only
 * describes the shape of the data.
 *
 * Timestamps (`occurredAt`, `ingestedAt`): ISO 8601 / RFC 3339, UTC, trailing
 * "Z", millisecond precision as produced by Date.toISOString(). Services store
 * and send UTC only; UIs convert to local time for display.
 *
 * Rules for `details` (documentation only, not enforced by validation):
 * - Never put secrets in `details`: no API keys, tokens, passwords, cookies,
 *   authorization headers or ad-platform credentials.
 * - Never put raw personal data in `details`: reference people and records by
 *   id (userId, target.id) rather than by name, email, phone or free text.
 * - Keep it small and structured; large payloads belong in their own store,
 *   referenced by id.
 *
 * Raw text (`content`, since 0.3.3): the one place where human or model text
 * (a user's message, a brain reply, an explanation, a prompt) may travel with an
 * event. It is optional, bounded (AUDIT_CONTENT_MAX_CHARS, truncated and flagged),
 * and the producer must have masked secrets in it (passwords, tokens, API keys,
 * card numbers) before it is set. The audit consumer stores it apart from the
 * event (own retention and permissions) and covers it in the hash chain with a
 * digest (`StoredAuditEvent.contentDigest`). Everything else above still applies:
 * `details` never carries text.
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

/**
 * Maximum length of AuditContent.text, in UTF-16 code units (JavaScript `string.length`).
 * Longer text is truncated by the producer and flagged with `truncated`.
 */
export const AUDIT_CONTENT_MAX_CHARS = 16384;

/**
 * Recommended `kind` values. The field is an open lower-case snake_case string so that
 * new kinds are additive; consumers must tolerate kinds they do not know.
 */
export const AUDIT_CONTENT_KINDS = [
  'user_message',
  'brain_reply',
  'brain_clarification',
  'explanation',
  'prompt',
] as const;

export type AuditContentKind = (typeof AUDIT_CONTENT_KINDS)[number];

/**
 * Raw text attached to an audit event (optional, additive since 0.3.3).
 */
export interface AuditContent {
  /** What the text is: one of AUDIT_CONTENT_KINDS (type AuditContentKind), or another lower-case snake_case name. */
  kind: string;
  /** The text, secrets masked by the producer, at most AUDIT_CONTENT_MAX_CHARS. */
  text: string;
  /** True when the text was cut at AUDIT_CONTENT_MAX_CHARS. */
  truncated: boolean;
  /** Length of the text (after masking) before truncation. Equals text.length when not truncated. */
  originalLength: number;
  /** How many secrets were masked in the text. */
  redactions: number;
}

export interface AuditEvent {
  /** Schema version of this event. */
  version: AuditEventVersion;
  /** Producer-generated UUID; the consumer dedupes on it. */
  eventId: string;
  /**
   * UUID that ties together everything caused by one root. The root is the web
   * command's clientMsgId, or a job run id for background work. It stays a UUID
   * and is OpenTelemetry-compatible: remove the dashes to get the 32-hex
   * OpenTelemetry trace id.
   */
  traceId: string;
  /**
   * Id of this step within the trace: OpenTelemetry style, exactly 16 lowercase
   * hex characters, not all zeros.
   */
  spanId: string;
  /** spanId of the step that caused this one (same format); absent for the root span. */
  parentSpanId?: string;
  /**
   * Workspace the action belongs to. Free string. Suggested default workspace
   * id (documentation only): "seedbed".
   */
  workspaceId: string;
  userId?: string;
  goalId?: string;
  threadId?: string;
  /**
   * Free string, not a uuid: campaign ids usually come from ad platforms, whose
   * ids are not uuids.
   */
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
  /** UTC timestamp (see the timestamp rule above) of when the action happened, not when it was ingested. */
  occurredAt: string;
  /** Structured context. See the rules at the top of this file. */
  details: Record<string, unknown>;
  tags?: string[];
  /** Optional raw text (since 0.3.3). See the notes at the top of this file. */
  content?: AuditContent;
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
  /**
   * SHA-256 (lower-case hex) of canonicalizeAuditContent(content), set by the consumer when
   * the event carried content. The chain hash covers the digest, not the text, so the text can
   * live in its own store and be deleted by retention while the chain stays verifiable.
   */
  contentDigest?: string;
}
