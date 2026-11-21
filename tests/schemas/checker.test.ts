import {
  checkerRequestSchema,
  checkerVerdictSchema,
  paidActionRequestSchema,
} from '../../src/schemas/checker.js';

describe('H3-01 CheckerRequest, CheckerVerdict, and PaidActionRequest schemas', () => {
  it('validates CheckerRequest, CheckerVerdict, and PaidActionRequest', () => {
    const req = checkerRequestSchema.parse({
      artifactKind: 'creative_copy',
      goalId: 'goal-1',
      platform: 'reddit',
      userLandingPageUrl: 'https://example.com/offer',
      payload: { headline: 'Ship faster', body: 'Try Proba today.' },
    });
    expect(req.artifactKind).toBe('creative_copy');

    const verdict = checkerVerdictSchema.parse({
      approved: false,
      layer: 'deterministic',
      reason: 'Landing URL does not match user-supplied URL',
      field: 'landingPageUrl',
      checkedAt: '2026-11-21T22:00:00Z',
    });
    expect(verdict.repairAttempt).toBe(0);
    expect(verdict.needsHuman).toBe(false);

    const paid = paidActionRequestSchema.parse({
      goalId: 'goal-1',
      actionType: 'media_generate',
      estimatedCostUsd: 0.08,
      justification: 'no_usable_site_image',
      evidence: 'Research found 0 images >= 400px',
    });
    expect(paid.hasUsableExistingImage).toBe(false);
  });
});
