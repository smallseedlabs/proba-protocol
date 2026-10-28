/**
 * Zod schemas for the context bridge (additive since 0.4.0).
 *
 * Packet shapes, typed needs, act-as assertion claims, and recommended
 * `details` payloads for `context.*` / `brain.context_attached` audit events.
 * Details never carry item text.
 */

import { z } from 'zod';

const uuidSchema = z.string().uuid();
const sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

/** Brain step types the bridge builds context for. */
export const stepTypeSchema = z.enum([
  'interpret_message',
  'clarify',
  'plan_goal',
  'propose_budget',
  'handle_approval',
  'launch_campaign',
  'review_performance',
  'explain_decision',
]);

export type StepType = z.infer<typeof stepTypeSchema>;

/** Trust level of a context item. */
export const itemTrustSchema = z.enum(['system', 'user', 'derived', 'external']);

export type ItemTrust = z.infer<typeof itemTrustSchema>;

/** Section kinds inside a context packet. */
export const sectionKindSchema = z.enum([
  'policy',
  'task',
  'conversation',
  'memory',
  'audit_history',
  'analytics',
  'tools',
]);

export type SectionKind = z.infer<typeof sectionKindSchema>;

/**
 * Known gap codes. `Gap.code` is an open string so new codes may appear; these
 * are the ones the bridge ships with.
 */
export const KNOWN_GAP_CODES = [
  'no_analytics_for_campaign',
  'memory_unavailable',
  'audit_history_unavailable',
  'conversation_unavailable',
  'need_refused_by_policy',
  'need_out_of_limits',
  'source_timeout',
] as const;

export type KnownGapCode = (typeof KNOWN_GAP_CODES)[number];

export const knownGapCodeSchema = z.enum(KNOWN_GAP_CODES);

/** Metric names allowed in an analytics_compare need. */
export const contextAnalyticsMetricSchema = z.enum([
  'impressions',
  'clicks',
  'spend',
  'conversions',
  'ctr',
  'cpc',
  'cpa',
]);

/** Time windows allowed in an analytics_compare need. */
export const contextAnalyticsWindowSchema = z.enum(['1d', '7d', '14d', '30d', '90d']);

/**
 * Typed, bounded context needs the brain may ask for after the first packet
 * (hybrid phase). Discriminated on `kind`; no free-form queries.
 */
export const memorySearchNeedSchema = z.object({
  kind: z.literal('memory_search'),
  query: z.string().min(1).max(500),
  limit: z.number().int().positive().max(20).default(5),
});

export const analyticsCompareNeedSchema = z.object({
  kind: z.literal('analytics_compare'),
  campaignIds: z.array(uuidSchema).min(1).max(10),
  metric: contextAnalyticsMetricSchema,
  window: contextAnalyticsWindowSchema,
});

export const auditTraceNeedSchema = z.object({
  kind: z.literal('audit_trace'),
  traceId: uuidSchema,
});

export const conversationBeforeNeedSchema = z.object({
  kind: z.literal('conversation_before'),
  cursor: z.string().min(1),
  limit: z.number().int().positive().max(50).default(20),
});

export const contextNeedSchema = z.discriminatedUnion('kind', [
  memorySearchNeedSchema,
  analyticsCompareNeedSchema,
  auditTraceNeedSchema,
  conversationBeforeNeedSchema,
]);

export type ContextNeed = z.infer<typeof contextNeedSchema>;

/** One citable item inside a section. */
export const contextItemSchema = z
  .object({
    itemId: z.string().min(1),
    sourceRef: z.object({
      source: z.string().min(1),
      id: z.string().min(1),
    }),
    trust: itemTrustSchema,
    text: z.string().optional(),
    data: z.unknown().optional(),
    observedAt: z.string().datetime(),
    score: z.number().optional(),
  })
  .refine((item) => item.text !== undefined || item.data !== undefined, {
    message: 'item must carry text and/or data',
  });

export type ContextItem = z.infer<typeof contextItemSchema>;

export const contextSectionSchema = z.object({
  kind: sectionKindSchema,
  priority: z.number().int().nonnegative(),
  tokens: z.number().int().nonnegative(),
  items: z.array(contextItemSchema),
});

export type ContextSection = z.infer<typeof contextSectionSchema>;

export const contextGapSchema = z.object({
  code: z.string().min(1),
  source: z.string().min(1),
  reason: z.string().min(1),
  suggestedQuestion: z.string().min(1).optional(),
});

export type ContextGap = z.infer<typeof contextGapSchema>;

/** Per-source stats in a packet manifest (never item text). */
export const contextManifestSourceSchema = z.object({
  requested: z.boolean(),
  returned: z.number().int().nonnegative(),
  included: z.number().int().nonnegative(),
  dropped: z.number().int().nonnegative(),
  droppedReasons: z.record(z.number().int().nonnegative()).default({}),
  cacheHit: z.boolean(),
  latencyMs: z.number().nonnegative(),
  tokens: z.number().int().nonnegative(),
});

export const contextManifestSchema = z.object({
  sources: z.record(contextManifestSourceSchema),
  totals: z.object({
    returned: z.number().int().nonnegative(),
    included: z.number().int().nonnegative(),
    dropped: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(),
    gaps: z.number().int().nonnegative(),
    latencyMs: z.number().nonnegative(),
  }),
  droppedItemIds: z.array(z.string().min(1)).default([]),
});

export type ContextManifest = z.infer<typeof contextManifestSchema>;

export const contextRequestSchema = z.object({
  traceId: uuidSchema,
  workspaceId: z.string().min(1),
  userId: uuidSchema,
  goalId: uuidSchema,
  threadId: uuidSchema,
  stepId: z.string().min(1),
  stepType: stepTypeSchema,
  needs: z.array(contextNeedSchema).max(20).optional(),
  budgetTokens: z.number().int().positive().optional(),
  profile: z.string().min(1).optional(),
});

export type ContextRequest = z.infer<typeof contextRequestSchema>;

export const contextPacketSchema = z.object({
  packetId: uuidSchema,
  packetHash: sha256HexSchema,
  traceId: uuidSchema,
  workspaceId: z.string().min(1),
  userId: uuidSchema,
  goalId: uuidSchema,
  stepId: z.string().min(1),
  configVersion: z.string().min(1),
  templateVersion: z.string().min(1),
  sections: z.array(contextSectionSchema),
  gaps: z.array(contextGapSchema),
  manifest: contextManifestSchema,
});

export type ContextPacket = z.infer<typeof contextPacketSchema>;

/**
 * Claims inside an act-as assertion JWT (EdDSA), minted by the Hub and
 * forwarded by the bridge as `X-Act-As`. `exp` must be at most 5 minutes after `iat`.
 */
export const ACT_AS_ASSERTION_MAX_TTL_SECONDS = 5 * 60;

export const actAsAssertionAudienceSchema = z.enum([
  'proba-context',
  'proba-audit',
  'proba-memory',
  'proba-hub',
]);

export const actAsAssertionClaimsSchema = z
  .object({
    iss: z.literal('proba-hub'),
    aud: z.array(actAsAssertionAudienceSchema).min(1),
    sub: z.string().min(1),
    workspaceId: z.string().min(1),
    goalId: uuidSchema,
    threadId: uuidSchema,
    scopes: z.array(z.string().min(1)).min(1),
    iat: z.number().int().nonnegative(),
    exp: z.number().int().positive(),
    jti: z.string().min(1),
    nbf: z.number().int().nonnegative().optional(),
  })
  .refine((c) => c.exp > c.iat, {
    message: 'exp must be after iat',
    path: ['exp'],
  })
  .refine((c) => c.exp - c.iat <= ACT_AS_ASSERTION_MAX_TTL_SECONDS, {
    message: `exp must be at most ${ACT_AS_ASSERTION_MAX_TTL_SECONDS} seconds after iat`,
    path: ['exp'],
  });

export type ActAsAssertionClaims = z.infer<typeof actAsAssertionClaimsSchema>;

/**
 * Recommended `details` for `context.*` audit events: ids and counts only,
 * never item text.
 */
export const contextAuditDetailsSchema = z
  .object({
    packetId: uuidSchema.optional(),
    packetHash: sha256HexSchema.optional(),
    workspaceId: z.string().min(1).optional(),
    userId: uuidSchema.optional(),
    goalId: uuidSchema.optional(),
    stepId: z.string().min(1).optional(),
    stepType: stepTypeSchema.optional(),
    source: z.string().min(1).optional(),
    needKind: z.string().min(1).optional(),
    gapCode: z.string().min(1).optional(),
    configVersion: z.string().min(1).optional(),
    counts: z.record(z.number()).optional(),
  })
  .strict();

export type ContextAuditDetails = z.infer<typeof contextAuditDetailsSchema>;

/** Recommended `details` for `brain.context_attached`. */
export const brainContextAttachedDetailsSchema = z
  .object({
    packetId: uuidSchema,
    packetHash: sha256HexSchema,
    stepId: z.string().min(1),
    stepType: stepTypeSchema,
    configVersion: z.string().min(1),
  })
  .strict();

export type BrainContextAttachedDetails = z.infer<typeof brainContextAttachedDetailsSchema>;

export function validateContextRequest(value: unknown) {
  return contextRequestSchema.safeParse(value);
}

export function validateContextPacket(value: unknown) {
  return contextPacketSchema.safeParse(value);
}

export function validateContextNeed(value: unknown) {
  return contextNeedSchema.safeParse(value);
}

export function validateActAsAssertionClaims(value: unknown) {
  return actAsAssertionClaimsSchema.safeParse(value);
}
