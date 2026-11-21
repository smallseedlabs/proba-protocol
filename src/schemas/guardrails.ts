import { z } from 'zod';
import { utcDateTimeSchema } from './iso.js';

export const refusalCodeSchema = z.enum([
  'missing_budget',
  'missing_targeting',
  'missing_landing_url',
  'missing_approval_token',
  'invalid_approval_token',
  'goal_lifetime_cap_exceeded',
  'goal_daily_cap_exceeded',
  'account_daily_cap_exceeded',
  'goal_max_live_exceeded',
  'billing_not_ready',
  'provider_refused',
  'targeting_refused',
  'ad_group_create_failed',
  'ad_create_failed',
  'kill_switch_active',
  'watchdog_paused',
  'planner_bounds_exceeded',
  'checker_rejected',
  'spend_gate_denied',
  'research_not_accepted',
]);
export type RefusalCode = z.infer<typeof refusalCodeSchema>;

export const guardrailPolicySchema = z.object({
  goalLifetimeCapUsd: z.number().finite().positive(),
  goalDailyCapUsd: z.number().finite().positive(),
  accountDailyCapUsd: z.number().finite().positive(),
  maxLivePerGoal: z.number().int().positive(),
  watchdogPaceMultiplier: z.number().finite().positive().default(3),
  reviewerWakePaceMultiplier: z.number().finite().positive().default(1.3),
  autoActivateOnLaunch: z.boolean().default(false),
  updatedAt: utcDateTimeSchema.optional(),
});
export type GuardrailPolicy = z.infer<typeof guardrailPolicySchema>;

export const ledgerEntryKindSchema = z.enum([
  'reserve',
  'commit',
  'release',
  'spend_observation',
  'cap_adjustment',
]);
export type LedgerEntryKind = z.infer<typeof ledgerEntryKindSchema>;

export const ledgerEntrySchema = z.object({
  id: z.uuid(),
  workspaceId: z.string().min(1).max(128),
  goalId: z.string().min(1).max(128),
  campaignId: z.string().min(1).max(128).optional(),
  platform: z.enum(['reddit', 'meta', 'google']).optional(),
  kind: ledgerEntryKindSchema,
  amountUsd: z.number().finite().nonnegative(),
  currency: z.string().length(3).default('USD'),
  dailyAllocationUsd: z.number().finite().nonnegative().optional(),
  idempotencyKey: z.string().min(1).max(128),
  createdAt: utcDateTimeSchema,
});
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

export const refusalPayloadSchema = z.object({
  code: refusalCodeSchema,
  message: z.string().min(1).max(1000),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type RefusalPayload = z.infer<typeof refusalPayloadSchema>;
