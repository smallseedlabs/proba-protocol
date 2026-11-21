import {
  guardrailPolicySchema,
  ledgerEntrySchema,
  refusalCodeSchema,
  refusalPayloadSchema,
} from '../../src/schemas/guardrails.js';

describe('H1-01 guardrail, ledger, and refusal schemas', () => {
  it('validates GuardrailPolicy with defaults and rejects non-positive caps', () => {
    const parsed = guardrailPolicySchema.parse({
      goalLifetimeCapUsd: 100,
      goalDailyCapUsd: 25,
      accountDailyCapUsd: 200,
      maxLivePerGoal: 2,
    });
    expect(parsed.watchdogPaceMultiplier).toBe(3);
    expect(parsed.reviewerWakePaceMultiplier).toBe(1.3);
    expect(parsed.autoActivateOnLaunch).toBe(false);

    expect(
      guardrailPolicySchema.safeParse({
        goalLifetimeCapUsd: 0,
        goalDailyCapUsd: 25,
        accountDailyCapUsd: 200,
        maxLivePerGoal: 2,
      }).success
    ).toBe(false);
  });

  it('validates LedgerEntry and rejects negative amounts', () => {
    const entry = ledgerEntrySchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      workspaceId: 'ws_1',
      goalId: 'goal_1',
      campaignId: 'cmp_1',
      platform: 'reddit',
      kind: 'reserve',
      amountUsd: 50,
      dailyAllocationUsd: 10,
      idempotencyKey: 'idem-1',
      createdAt: '2026-11-21T20:00:00Z',
    });
    expect(entry.currency).toBe('USD');
    expect(
      ledgerEntrySchema.safeParse({
        ...entry,
        amountUsd: -5,
      }).success
    ).toBe(false);
  });

  it('validates RefusalCode and RefusalPayload', () => {
    expect(refusalCodeSchema.safeParse('goal_lifetime_cap_exceeded').success).toBe(true);
    expect(refusalCodeSchema.safeParse('unknown_code').success).toBe(false);

    const payload = refusalPayloadSchema.parse({
      code: 'account_daily_cap_exceeded',
      message: 'Account daily cap exceeded',
      details: { limitUsd: 100, requestedUsd: 120 },
    });
    expect(payload.code).toBe('account_daily_cap_exceeded');
  });
});
