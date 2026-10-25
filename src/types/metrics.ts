/**
 * Normalised ad-platform metric types.
 *
 * A MetricObservation is one platform-agnostic reading of a campaign's numbers
 * for a time period. Fetchers map each ad platform's response into this shape.
 */

/**
 * Timestamps (`periodStart`, `periodEnd`, `fetchedAt`): ISO 8601 / RFC 3339,
 * UTC, trailing "Z", millisecond precision as produced by Date.toISOString().
 * Services store and send UTC only; UIs convert to local time for display.
 * The ad account's reporting timezone is carried separately in `timezone`.
 */

export const METRIC_OBSERVATION_VERSION = 1;

export type MetricObservationVersion = typeof METRIC_OBSERVATION_VERSION;

export type MetricPlatform = 'meta' | 'google' | 'reddit' | 'x' | 'microsoft' | 'other';

export type MetricGranularity = 'hour' | 'day';

export interface MetricValues {
  impressions: number;
  clicks: number;
  /** Amount spent, in major units of the observation's `currency`. */
  spend: number;
  /** May be fractional: some platforms report modelled conversions. */
  conversions: number;
  reach?: number;
  videoViews?: number;
  /** Revenue attributed by the platform, in major units of `currency`. */
  revenue?: number;
}

export interface MetricObservation {
  version: MetricObservationVersion;
  platform: MetricPlatform;
  accountId: string;
  campaignId: string;
  adsetId?: string;
  adId?: string;
  granularity: MetricGranularity;
  /** ISO 8601 UTC start of the period (inclusive). */
  periodStart: string;
  /** ISO 8601 UTC end of the period; must be after periodStart. */
  periodEnd: string;
  metrics: MetricValues;
  /** ISO 4217 currency code for spend and revenue. */
  currency: string;
  /** ISO 8601 UTC timestamp of when the platform was queried. */
  fetchedAt: string;
  /**
   * IANA time zone name of the ad account's reporting timezone, e.g.
   * "Europe/London". It defines what a `day` granularity period means for the
   * account (local midnight to local midnight); periodStart/periodEnd are still
   * UTC instants.
   */
  timezone?: string;
  /**
   * 0 is the first fetch of the period; each restatement of the same period
   * increments it.
   */
  revision: number;
  /** Opaque pointer to the raw source (e.g. a report or request id). Not a URL with credentials. */
  sourceRef?: string;
}
