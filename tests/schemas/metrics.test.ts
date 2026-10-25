/**
 * Tests for metric observation schemas.
 */

import { describe, it, expect } from '@jest/globals';
import {
  metricObservationSchema,
  validateMetricObservation,
  isValidTimeZone,
} from '../../src/schemas/metrics.js';
import { isMetricObservation } from '../../src/utils/audit.js';

const valid = {
  version: 1,
  platform: 'meta',
  accountId: 'act_123',
  campaignId: 'cmp_456',
  adsetId: 'as_1',
  adId: 'ad_1',
  granularity: 'day',
  periodStart: '2026-10-24T00:00:00.000Z',
  periodEnd: '2026-10-25T00:00:00.000Z',
  metrics: {
    impressions: 10000,
    clicks: 250,
    spend: 123.45,
    conversions: 12.5,
    reach: 8000,
    videoViews: 900,
    revenue: 480,
  },
  currency: 'USD',
  fetchedAt: '2026-10-25T06:00:00.000Z',
  timezone: 'Europe/London',
  revision: 0,
  sourceRef: 'report-789',
};

describe('Metric Schemas', () => {
  describe('metricObservationSchema', () => {
    it('should validate a fully populated observation', () => {
      expect(metricObservationSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate with only required fields', () => {
      const required = {
        version: 1,
        platform: 'google',
        accountId: 'a',
        campaignId: 'c',
        granularity: 'hour',
        periodStart: '2026-10-25T10:00:00.000Z',
        periodEnd: '2026-10-25T11:00:00.000Z',
        metrics: { impressions: 0, clicks: 0, spend: 0, conversions: 0 },
        currency: 'EUR',
        fetchedAt: '2026-10-25T11:05:00.000Z',
        revision: 1,
      };
      expect(metricObservationSchema.safeParse(required).success).toBe(true);
    });

    it('should accept every platform and granularity', () => {
      for (const platform of ['meta', 'google', 'reddit', 'x', 'microsoft', 'other']) {
        expect(metricObservationSchema.safeParse({ ...valid, platform }).success).toBe(true);
      }
      for (const granularity of ['hour', 'day']) {
        expect(metricObservationSchema.safeParse({ ...valid, granularity }).success).toBe(true);
      }
    });

    it('should reject unknown platform or granularity', () => {
      expect(metricObservationSchema.safeParse({ ...valid, platform: 'tiktok' }).success).toBe(false);
      expect(metricObservationSchema.safeParse({ ...valid, granularity: 'week' }).success).toBe(false);
    });

    it.each(['accountId', 'campaignId', 'platform', 'granularity', 'periodStart', 'periodEnd', 'metrics', 'currency', 'fetchedAt', 'revision', 'version'])(
      'should reject when %s is missing',
      (field) => {
        const { [field]: _removed, ...rest } = valid as Record<string, unknown>;
        void _removed;
        expect(metricObservationSchema.safeParse(rest).success).toBe(false);
      }
    );

    it.each(['impressions', 'clicks', 'spend', 'conversions'])('should reject when metrics.%s is missing', (field) => {
      const { [field]: _removed, ...metrics } = valid.metrics as Record<string, unknown>;
      void _removed;
      expect(metricObservationSchema.safeParse({ ...valid, metrics }).success).toBe(false);
    });

    it('should reject negative or fractional counts', () => {
      expect(metricObservationSchema.safeParse({ ...valid, metrics: { ...valid.metrics, clicks: -1 } }).success).toBe(false);
      expect(metricObservationSchema.safeParse({ ...valid, metrics: { ...valid.metrics, impressions: 1.5 } }).success).toBe(false);
      expect(metricObservationSchema.safeParse({ ...valid, metrics: { ...valid.metrics, spend: -0.01 } }).success).toBe(false);
    });

    it('should allow fractional conversions', () => {
      expect(metricObservationSchema.safeParse({ ...valid, metrics: { ...valid.metrics, conversions: 0.4 } }).success).toBe(true);
    });

    it('should require a 3-letter currency', () => {
      expect(metricObservationSchema.safeParse({ ...valid, currency: 'US' }).success).toBe(false);
      expect(metricObservationSchema.safeParse({ ...valid, currency: 'USDX' }).success).toBe(false);
    });

    it('should require periodEnd after periodStart', () => {
      expect(metricObservationSchema.safeParse({ ...valid, periodEnd: valid.periodStart }).success).toBe(false);
      expect(metricObservationSchema.safeParse({ ...valid, periodEnd: '2026-10-23T00:00:00.000Z' }).success).toBe(false);
    });

    it('should accept valid IANA time zones and omit-able timezone', () => {
      for (const timezone of ['Europe/London', 'America/Los_Angeles', 'Asia/Kolkata', 'UTC']) {
        expect(metricObservationSchema.safeParse({ ...valid, timezone }).success).toBe(true);
      }
      const { timezone: _tz, ...withoutTz } = valid;
      void _tz;
      expect(metricObservationSchema.safeParse(withoutTz).success).toBe(true);
    });

    it('should reject empty or unknown time zones', () => {
      for (const timezone of ['', 'Mars/Olympus_Mons', 'not a zone']) {
        expect(metricObservationSchema.safeParse({ ...valid, timezone }).success).toBe(false);
      }
    });

    it('isValidTimeZone should mirror Intl support', () => {
      expect(isValidTimeZone('Europe/London')).toBe(true);
      expect(isValidTimeZone('Nowhere/Land')).toBe(false);
    });

    it('should accept revision 0 as the first fetch', () => {
      expect(metricObservationSchema.safeParse({ ...valid, revision: 0 }).success).toBe(true);
    });

    it('should accept only UTC timestamps with a trailing Z', () => {
      expect(metricObservationSchema.safeParse({ ...valid, periodStart: '2026-10-24T00:00:00.000+01:00' }).success).toBe(false);
    });

    it('should require integer, non-negative revision', () => {
      expect(metricObservationSchema.safeParse({ ...valid, revision: -1 }).success).toBe(false);
      expect(metricObservationSchema.safeParse({ ...valid, revision: 1.5 }).success).toBe(false);
    });

    it('should reject malformed timestamps and unknown version', () => {
      expect(metricObservationSchema.safeParse({ ...valid, fetchedAt: 'now' }).success).toBe(false);
      expect(metricObservationSchema.safeParse({ ...valid, version: 2 }).success).toBe(false);
    });
  });

  describe('validateMetricObservation / isMetricObservation', () => {
    it('should return a result object', () => {
      expect(validateMetricObservation(valid).success).toBe(true);
      const bad = validateMetricObservation({ ...valid, periodEnd: valid.periodStart });
      expect(bad.success).toBe(false);
      if (!bad.success) expect(bad.error.issues[0].path).toEqual(['periodEnd']);
    });

    it('should guard correctly', () => {
      expect(isMetricObservation(valid)).toBe(true);
      expect(isMetricObservation(null)).toBe(false);
      expect(isMetricObservation({})).toBe(false);
    });
  });
});
