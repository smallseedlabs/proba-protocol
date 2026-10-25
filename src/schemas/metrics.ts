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

/** True when the runtime's Intl implementation accepts the IANA time zone name. */
export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// Timestamp rule: ISO 8601 / RFC 3339, UTC, trailing "Z", millisecond precision
// as produced by Date.toISOString(). Offsets are rejected. Services store and
// send UTC only; UIs convert to local time for display.
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
    timezone: z
      .string()
      .min(1)
      .refine(isValidTimeZone, { message: 'timezone must be an IANA time zone name' })
      .optional(),
    // 0 is the first fetch of the period; each restatement increments it.
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
