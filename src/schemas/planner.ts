import { z } from 'zod';

export const plannerClampSchema = z.object({
  field: z.string().min(1).max(64),
  requested: z.unknown(),
  applied: z.unknown(),
  reason: z.string().min(1).max(500),
});
export type PlannerClamp = z.infer<typeof plannerClampSchema>;

export const planProposalSchema = z.object({
  totalBudget: z.number().finite().positive(),
  currency: z.string().length(3),
  durationDays: z.number().int().min(3).max(30).default(7),
  platforms: z.array(z.enum(['reddit', 'meta', 'google'])).min(1),
  geolocations: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1),
  hasPixel: z.boolean().default(false),
  pixelVerified: z.boolean().default(false),
  goalIntent: z.enum(['traffic', 'awareness', 'leads', 'sales']).default('traffic'),
  creativeFormat: z.enum(['IMAGE', 'VIDEO', 'TEXT']).default('IMAGE'),
  requestedCells: z.number().int().positive().optional(),
  requestedDailyBudget: z.number().finite().positive().optional(),
});
export type PlanProposal = z.infer<typeof planProposalSchema>;

export const plannerPlanSchema = z.object({
  totalBudget: z.number().finite().positive(),
  dailyBudget: z.number().finite().positive(),
  currency: z.string().length(3),
  durationDays: z.number().int().min(3).max(30),
  platforms: z.array(z.enum(['reddit', 'meta', 'google'])).min(1),
  cells: z.number().int().positive(),
  objective: z.enum(['OUTCOME_TRAFFIC', 'OUTCOME_AWARENESS', 'OUTCOME_LEADS', 'OUTCOME_SALES']),
  optimizationGoal: z.enum(['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'IMPRESSIONS', 'OFFSITE_CONVERSIONS']),
  creativeFormat: z.enum(['IMAGE', 'VIDEO', 'TEXT']),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1),
  clamps: z.array(plannerClampSchema),
});
export type PlannerPlan = z.infer<typeof plannerPlanSchema>;

export const plannerResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    plan: plannerPlanSchema,
  }),
  z.object({
    ok: z.literal(false),
    code: z.enum(['missing_targeting', 'budget_below_minimum', 'missing_platform']),
    message: z.string().min(1).max(1000),
  }),
]);
export type PlannerResult = z.infer<typeof plannerResultSchema>;
