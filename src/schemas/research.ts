/**
 * Research review contract (additive since 0.5.0).
 *
 * Field names match gateway `src/types/research.ts` at
 * smallseedlabs/proba-llm-gateway@86630d02cbbeb6b6459676b547c41064d6df3321
 * (PR4 not merged). Context packets are existing-data retrieval, not research
 * and not citations. There is no default landing URL.
 *
 * workspaceId / userId on a persisted artifact are Hub-authored from
 * authenticated request context. They are never taken from model/tool fields
 * or from `userSuppliedInput`.
 */

import { z } from 'zod';
import { utcDateTimeSchema } from './iso.js';

export const LANDING_PAGE_URL_MAX = 2048;
export const RESEARCH_ACCEPT_VERB = 'research.accept';
export const RESEARCH_SOURCE_KIND = 'http_url';

const uuidSchema = z.uuid();
const sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

export type LandingPageUrlParseResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Syntactic checks for an operator-entered landing URL. Same rules as Ads
 * request-arg validation: http(s), no credentials, max 2048, original string
 * preserved. This does not fetch, does not SSRF-check, and does not invent a
 * destination. Callers must not default, hardcode, or auto-prefill a URL.
 */
export function parseLandingPageUrl(raw: unknown): LandingPageUrlParseResult {
  if (typeof raw !== 'string' || raw.length === 0) {
    return {
      ok: false,
      message:
        'landingPageUrl is required and must be supplied; there is no default destination',
    };
  }
  if (raw.length > LANDING_PAGE_URL_MAX) {
    return { ok: false, message: 'landingPageUrl is too long' };
  }
  if (raw !== raw.trim()) {
    return {
      ok: false,
      message: 'landingPageUrl must not include leading or trailing whitespace',
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, message: 'landingPageUrl is not a valid absolute URL' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, message: 'landingPageUrl must be http or https' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, message: 'landingPageUrl must not include credentials' };
  }
  if (!parsed.hostname) {
    return { ok: false, message: 'landingPageUrl must include a hostname' };
  }
  return { ok: true, url: raw };
}

export const landingPageUrlSchema = z
  .string()
  .min(1)
  .max(LANDING_PAGE_URL_MAX)
  .superRefine((value, ctx) => {
    const parsed = parseLandingPageUrl(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: 'custom', message: parsed.message });
    }
  });

/**
 * Operator-collected input on create_goal (campaign-goal command).
 * Strict: only `landingPageUrl`. Auth identity is not a model or command field.
 */
export const userSuppliedInputSchema = z
  .object({
    landingPageUrl: landingPageUrlSchema,
  })
  .strict();

export type UserSuppliedInput = z.infer<typeof userSuppliedInputSchema>;

export const researchArtifactStatusSchema = z.enum([
  'awaiting_acceptance',
  'accepted',
  'invalidated',
  'failed',
]);

export type ResearchArtifactStatus = z.infer<typeof researchArtifactStatusSchema>;

export const researchSourceSchema = z
  .object({
    sourceId: z.string().min(1).max(128),
    kind: z.literal(RESEARCH_SOURCE_KIND),
    url: z.string().min(1).max(LANDING_PAGE_URL_MAX),
    fetchedAt: utcDateTimeSchema,
    contentType: z.string().max(256).optional(),
    sha256: sha256HexSchema,
    excerpt: z.string().max(4096).optional(),
  })
  .strict();

export type ResearchSource = z.infer<typeof researchSourceSchema>;

/** Redacted source row Hub/web render for `research.accept` (gateway snapshot shape). */
export const researchReviewSourceSchema = z
  .object({
    sourceId: z.string().min(1).max(128),
    kind: z.literal(RESEARCH_SOURCE_KIND),
    url: z.string().min(1).max(LANDING_PAGE_URL_MAX),
    sha256: sha256HexSchema,
  })
  .strict();

export type ResearchReviewSource = z.infer<typeof researchReviewSourceSchema>;

export const researchFindingSchema = z
  .object({
    id: z.string().min(1).max(128),
    text: z.string().min(1).max(2000),
    sourceIds: z.array(z.string().min(1)).min(1).max(16),
  })
  .strict();

export type ResearchFinding = z.infer<typeof researchFindingSchema>;

export const researchAssumptionSchema = z
  .object({
    id: z.string().min(1).max(128),
    text: z.string().min(1).max(2000),
    basis: z.enum(['user_input', 'page_text', 'unverified']),
    sourceIds: z.array(z.string().min(1)).max(16).optional(),
  })
  .strict();

export type ResearchAssumption = z.infer<typeof researchAssumptionSchema>;

export const researchUnknownSchema = z
  .object({
    id: z.string().min(1).max(128),
    text: z.string().min(1).max(2000),
  })
  .strict();

export type ResearchUnknown = z.infer<typeof researchUnknownSchema>;

export function sourceIdsExist(
  sources: ReadonlyArray<{ sourceId: string }>,
  sourceIds: readonly string[]
): boolean {
  const ids = new Set(sources.map((row) => row.sourceId));
  return sourceIds.every((id) => ids.has(id));
}

/** Findings without provenance are not research. Context items are not sources. */
export function researchFindingsAreSourced(
  sources: ReadonlyArray<{ sourceId: string }>,
  findings: ReadonlyArray<{ sourceIds: readonly string[] }>
): boolean {
  if (sources.length === 0 || findings.length === 0) return false;
  return findings.every(
    (finding) =>
      finding.sourceIds.length > 0 && sourceIdsExist(sources, finding.sourceIds)
  );
}

export const researchArtifactSchema = z
  .object({
    artifactId: uuidSchema,
    version: z.number().int().positive(),
    workspaceId: z.string().min(1).max(256),
    userId: uuidSchema,
    goalId: uuidSchema,
    threadId: uuidSchema,
    landingPageUrl: z.string().min(1).max(LANDING_PAGE_URL_MAX),
    inputRevision: z.string().min(1).max(128),
    status: researchArtifactStatusSchema,
    providerName: z.string().min(1).max(128),
    sources: z.array(researchSourceSchema).max(32),
    findings: z.array(researchFindingSchema).max(32),
    assumptions: z.array(researchAssumptionSchema).max(32),
    unknowns: z.array(researchUnknownSchema).max(32),
    errorCode: z.string().max(64).optional(),
    errorMessage: z.string().max(500).optional(),
    acceptedAt: utcDateTimeSchema.optional(),
    acceptedByAskId: uuidSchema.optional(),
    createdAt: utcDateTimeSchema,
    updatedAt: utcDateTimeSchema,
  })
  .strict();

export type ResearchArtifact = z.infer<typeof researchArtifactSchema>;

/**
 * Same rule as gateway `canAccept`: awaiting_acceptance or accepted, at least
 * one source, every finding cites known sourceIds.
 */
export function canAcceptResearchArtifact(artifact: ResearchArtifact): boolean {
  if (artifact.status !== 'awaiting_acceptance' && artifact.status !== 'accepted') {
    return false;
  }
  return researchFindingsAreSourced(artifact.sources, artifact.findings);
}

export const researchAcceptanceBindingSchema = z
  .object({
    artifactId: uuidSchema,
    version: z.number().int().positive(),
    inputRevision: z.string().min(1).max(128),
  })
  .strict();

export type ResearchAcceptanceBinding = z.infer<typeof researchAcceptanceBindingSchema>;

/**
 * Explicit research review body on askType `research_review`.
 * `verb` is the Hub-mediated gateway verb `research.accept` (not an LLM tool).
 * Accepting this ask does not grant spend or bypass budget/policy.
 */
export const researchReviewAskSchema = z
  .object({
    verb: z.literal(RESEARCH_ACCEPT_VERB),
    artifactId: uuidSchema,
    version: z.number().int().positive(),
    inputRevision: z.string().min(1).max(128),
    landingPageUrl: landingPageUrlSchema,
    status: z.literal('awaiting_acceptance'),
    findings: z.array(researchFindingSchema).min(1).max(32),
    assumptions: z.array(researchAssumptionSchema).max(32),
    unknowns: z.array(researchUnknownSchema).max(32),
    sources: z.array(researchReviewSourceSchema).min(1).max(32),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!researchFindingsAreSourced(data.sources, data.findings)) {
      ctx.addIssue({
        code: 'custom',
        message:
          'research findings must cite sourceIds that exist on this artifact; unsourced findings are not research',
      });
    }
  });

export type ResearchReviewAsk = z.infer<typeof researchReviewAskSchema>;

export function researchAcceptanceMatches(
  review: Pick<ResearchReviewAsk, 'artifactId' | 'version' | 'inputRevision'>,
  binding: ResearchAcceptanceBinding
): boolean {
  return (
    review.artifactId === binding.artifactId &&
    review.version === binding.version &&
    review.inputRevision === binding.inputRevision
  );
}

export function validateUserSuppliedInput(value: unknown) {
  return userSuppliedInputSchema.safeParse(value);
}

export function validateResearchArtifact(value: unknown) {
  return researchArtifactSchema.safeParse(value);
}

export function validateResearchReviewAsk(value: unknown) {
  return researchReviewAskSchema.safeParse(value);
}

export function validateResearchAcceptanceBinding(value: unknown) {
  return researchAcceptanceBindingSchema.safeParse(value);
}
