/**
 * Zod schemas for audit trail validation.
 */

import { z } from 'zod';

export const auditActorTypeSchema = z.enum(['user', 'brain', 'system', 'service']);

export const auditCategorySchema = z.enum([
  'command',
  'brain',
  'tool',
  'policy',
  'approval',
  'data_access',
  'memory',
  'metrics',
  'auth',
  'config',
  'system',
]);

export const auditOutcomeSchema = z.enum(['success', 'failure', 'denied', 'partial']);

export const auditRiskLevelSchema = z.enum(['low', 'medium', 'high']);

export const auditActorSchema = z.object({
  type: auditActorTypeSchema,
  id: z.string().min(1),
});

export const auditTargetSchema = z.object({
  type: z.string().min(1),
  id: z.string().min(1),
});

export const auditCostSchema = z
  .object({
    tokensIn: z.number().int().nonnegative().optional(),
    tokensOut: z.number().int().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    amount: z.number().nonnegative().optional(),
  })
  .refine((cost) => (cost.currency === undefined) === (cost.amount === undefined), {
    message: 'currency and amount must be provided together',
  });

/** Dotted, lower-case action name with at least two segments, e.g. "command.received". */
export const AUDIT_ACTION_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export const auditEventSchema = z.object({
  version: z.literal(1),
  eventId: z.string().uuid(),
  traceId: z.string().uuid(),
  spanId: z.string().min(1).max(64),
  parentSpanId: z.string().min(1).max(64).optional(),
  workspaceId: z.string().min(1),
  userId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  campaignId: z.string().min(1).optional(),
  actor: auditActorSchema,
  service: z.string().min(1),
  action: z.string().regex(AUDIT_ACTION_PATTERN),
  category: auditCategorySchema,
  target: auditTargetSchema.optional(),
  outcome: auditOutcomeSchema,
  errorCode: z.string().min(1).optional(),
  errorMessage: z.string().optional(),
  riskLevel: auditRiskLevelSchema.optional(),
  cost: auditCostSchema.optional(),
  durationMs: z.number().nonnegative().optional(),
  occurredAt: z.string().datetime(),
  details: z.record(z.unknown()),
  tags: z.array(z.string().min(1)).optional(),
});

const sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const storedAuditEventSchema = auditEventSchema.extend({
  prevHash: sha256HexSchema.nullable(),
  hash: sha256HexSchema,
  ingestedAt: z.string().datetime(),
  schemaVersion: z.number().int().positive(),
});

export type AuditEventInput = z.input<typeof auditEventSchema>;

export function validateAuditEvent(value: unknown) {
  return auditEventSchema.safeParse(value);
}

export function validateStoredAuditEvent(value: unknown) {
  return storedAuditEventSchema.safeParse(value);
}
