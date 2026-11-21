import { z } from 'zod';
import { utcDateTimeSchema } from './iso.js';

export const checkerArtifactKindSchema = z.enum([
  'creative_copy',
  'creative_media',
  'targeting',
  'budget_plan',
  'optimiser_proposal',
]);
export type CheckerArtifactKind = z.infer<typeof checkerArtifactKindSchema>;

export const checkerRequestSchema = z.object({
  artifactKind: checkerArtifactKindSchema,
  goalId: z.string().min(1).max(128),
  platform: z.enum(['reddit', 'meta', 'google']).optional(),
  userLandingPageUrl: z.string().url().optional(),
  plannerBounds: z
    .object({
      dailyBudget: z.number().finite().positive(),
      totalBudget: z.number().finite().positive(),
      platforms: z.array(z.string()).min(1),
      countries: z.array(z.string()).min(1),
    })
    .optional(),
  payload: z.record(z.string(), z.unknown()),
});
export type CheckerRequest = z.infer<typeof checkerRequestSchema>;

export const checkerVerdictSchema = z.object({
  approved: z.boolean(),
  layer: z.enum(['deterministic', 'llm_checker']),
  reason: z.string().min(1).max(1000),
  field: z.string().min(1).max(128).optional(),
  repairAttempt: z.number().int().nonnegative().default(0),
  needsHuman: z.boolean().default(false),
  checkedAt: utcDateTimeSchema,
});
export type CheckerVerdict = z.infer<typeof checkerVerdictSchema>;

export const paidActionJustificationSchema = z.enum([
  'no_usable_site_image',
  'format_mismatch',
  'existing_asset_rejected_quality',
  'user_requested',
]);
export type PaidActionJustification = z.infer<typeof paidActionJustificationSchema>;

export const paidActionRequestSchema = z.object({
  goalId: z.string().min(1).max(128),
  actionType: z.enum(['media_generate', 'research_paid', 'llm_call']),
  estimatedCostUsd: z.number().finite().nonnegative(),
  justification: paidActionJustificationSchema,
  evidence: z.string().min(1).max(500),
  hasUsableExistingImage: z.boolean().default(false),
});
export type PaidActionRequest = z.infer<typeof paidActionRequestSchema>;
