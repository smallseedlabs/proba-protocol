/**
 * Zod schemas for normalised ad-platform metric validation.
 */

import { z } from 'zod';

export const metricPlatformSchema = z.enum(['meta', 'google', 'reddit', 'x', 'microsoft', 'other']);

export const metricGranularitySchema = z.enum(['hour', 'day']);

export const metricValuesSchema = z.object({
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  spend: z.number().nonnegative(),
  conversions: z.number().nonnegative(),
  reach: z.number().int().nonnegative().optional(),
  videoViews: z.number().int().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
});

export const metricObservationSchema = z
  .object({
    version: z.literal(1),
    platform: metricPlatformSchema,
    accountId: z.string().min(1),
    campaignId: z.string().min(1),
    adsetId: z.string().min(1).optional(),
    adId: z.string().min(1).optional(),
    granularity: metricGranularitySchema,
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    metrics: metricValuesSchema,
    currency: z.string().length(3),
    fetchedAt: z.string().datetime(),
    revision: z.number().int().nonnegative(),
    sourceRef: z.string().min(1).optional(),
  })
  .refine((o) => Date.parse(o.periodEnd) > Date.parse(o.periodStart), {
    message: 'periodEnd must be after periodStart',
    path: ['periodEnd'],
  });

export function validateMetricObservation(value: unknown) {
  return metricObservationSchema.safeParse(value);
}
