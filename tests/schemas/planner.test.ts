import {
  planProposalSchema,
  plannerResultSchema,
} from '../../src/schemas/planner.js';

describe('H2-02 PlanProposal and PlannerResult schemas', () => {
  it('round-trips PlanProposal and PlannerResult with required clamps array', () => {
    const proposal = planProposalSchema.parse({
      totalBudget: 100,
      currency: 'GBP',
      platforms: ['reddit'],
      geolocations: ['GB'],
    });
    expect(proposal.durationDays).toBe(7);

    const okResult = plannerResultSchema.parse({
      ok: true,
      plan: {
        totalBudget: 100,
        dailyBudget: 14.29,
        currency: 'GBP',
        durationDays: 7,
        platforms: ['reddit'],
        cells: 2,
        objective: 'OUTCOME_TRAFFIC',
        optimizationGoal: 'LINK_CLICKS',
        creativeFormat: 'IMAGE',
        countries: ['GB'],
        clamps: [],
      },
    });
    expect(okResult.ok).toBe(true);

    // clamps array is required
    expect(
      plannerResultSchema.safeParse({
        ok: true,
        plan: {
          totalBudget: 100,
          dailyBudget: 14.29,
          currency: 'GBP',
          durationDays: 7,
          platforms: ['reddit'],
          cells: 2,
          objective: 'OUTCOME_TRAFFIC',
          optimizationGoal: 'LINK_CLICKS',
          creativeFormat: 'IMAGE',
          countries: ['GB'],
        },
      }).success
    ).toBe(false);

    const failResult = plannerResultSchema.parse({
      ok: false,
      code: 'budget_below_minimum',
      message: 'Minimum test budget is 30',
    });
    expect(failResult.ok).toBe(false);
  });
});
