/**
 * Research review contract (0.5.0): userSuppliedInput, sourced artifacts,
 * research_review ask, revision-bound acceptance, edit invalidation.
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  parseLandingPageUrl,
  userSuppliedInputSchema,
  researchArtifactSchema,
  researchReviewAskSchema,
  researchFindingsAreSourced,
  canAcceptResearchArtifact,
  researchAcceptanceMatches,
  LANDING_PAGE_URL_MAX,
  RESEARCH_ACCEPT_VERB,
} from '../../src/schemas/research.js';
import {
  commandEnvelopeSchema,
  createGoalPayloadSchema,
  answerAskPayloadSchema,
  validateCommandPayload,
} from '../../src/schemas/command.js';
import { askPayloadSchema, eventEnvelopeSchema, validateEventPayload } from '../../src/schemas/event.js';
import { evaluateResearchReviewAnswer } from '../../src/utils/research.js';
import {
  buildResearchReviewAskEvent,
  buildResearchReviewAskPayload,
} from '../../src/builders/research.js';
import { buildCreateGoalCommand, buildAnswerAskCommand } from '../../src/builders/command.js';
import { mapToolCallToEvent, mapClarifyToEvent, mapPlanToEvent } from '../../src/mapping/brain-to-protocol.js';
import type { ResearchArtifact, ResearchReviewAsk } from '../../src/types/research.js';
import type { AskPayload } from '../../src/types/event.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '../../docs/research');

const ARTIFACT_ID = 'aa0e8400-e29b-41d4-a716-446655440010';
const ASK_ID = 'bb0e8400-e29b-41d4-a716-446655440011';
const USER_ID = 'cc0e8400-e29b-41d4-a716-446655440012';
const GOAL_ID = 'dd0e8400-e29b-41d4-a716-446655440013';
const THREAD_ID = 'ee0e8400-e29b-41d4-a716-446655440014';
const SHA = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const REVISION = 'a'.repeat(64);
const LANDING = 'https://operator-entered.example/path';
const NOW = '2026-11-08T17:00:00.000Z';

const sourcedReview = (): ResearchReviewAsk => ({
  verb: RESEARCH_ACCEPT_VERB,
  artifactId: ARTIFACT_ID,
  version: 1,
  inputRevision: REVISION,
  landingPageUrl: LANDING,
  status: 'awaiting_acceptance',
  findings: [{ id: 'f1', text: 'The page describes an example offer.', sourceIds: ['page-1'] }],
  assumptions: [{ id: 'a1', text: `Operator supplied ${LANDING}`, basis: 'user_input' }],
  unknowns: [{ id: 'u1', text: 'Audience was not verified beyond the fetched excerpt.' }],
  sources: [{ sourceId: 'page-1', kind: 'http_url', url: LANDING, sha256: SHA }],
});

const sourcedArtifact = (status: ResearchArtifact['status'] = 'awaiting_acceptance'): ResearchArtifact => ({
  artifactId: ARTIFACT_ID,
  version: 1,
  workspaceId: 'seedbed',
  userId: USER_ID,
  goalId: GOAL_ID,
  threadId: THREAD_ID,
  landingPageUrl: LANDING,
  inputRevision: REVISION,
  status,
  providerName: 'http-url',
  sources: [
    {
      sourceId: 'page-1',
      kind: 'http_url',
      url: LANDING,
      fetchedAt: NOW,
      sha256: SHA,
      excerpt: 'The page describes an example offer.',
    },
  ],
  findings: [{ id: 'f1', text: 'The page describes an example offer.', sourceIds: ['page-1'] }],
  assumptions: [{ id: 'a1', text: `Operator supplied ${LANDING}`, basis: 'user_input' }],
  unknowns: [{ id: 'u1', text: 'Audience was not verified beyond the fetched excerpt.' }],
  createdAt: NOW,
  updatedAt: NOW,
});

const clarifyAsk = {
  askId: ASK_ID,
  askType: 'clarify' as const,
  title: 'Need more info',
  blocking: true,
  risk: 'low' as const,
  questions: [{ id: 'q1', type: 'text' as const, label: 'What is your budget?' }],
};

function researchAsk(): AskPayload {
  return buildResearchReviewAskPayload({ askId: ASK_ID, research: sourcedReview() });
}

describe('landingPageUrl', () => {
  it('accepts an operator-entered http(s) URL and preserves the original string', () => {
    expect(parseLandingPageUrl(LANDING)).toEqual({ ok: true, url: LANDING });
    expect(userSuppliedInputSchema.safeParse({ landingPageUrl: LANDING }).success).toBe(true);
  });

  it('does not default or substitute a destination when omitted', () => {
    expect(parseLandingPageUrl(undefined).ok).toBe(false);
    expect(parseLandingPageUrl('').ok).toBe(false);
    expect(userSuppliedInputSchema.safeParse({}).success).toBe(false);
    expect(createGoalPayloadSchema.safeParse({ title: 'Campaign' }).success).toBe(true);
    const parsed = createGoalPayloadSchema.parse({ title: 'Campaign' });
    expect(parsed.userSuppliedInput).toBeUndefined();
  });

  it.each([
    ['relative', '/offer'],
    ['not a url', 'not-a-url'],
    ['ftp', 'ftp://operator-entered.example/path'],
    ['javascript', 'javascript:alert(1)'],
    ['credentials', 'https://user:pass@operator-entered.example/path'],
    ['whitespace', ' https://operator-entered.example/path'],
    ['trailing whitespace', 'https://operator-entered.example/path '],
    ['missing host', 'https://'],
  ])('rejects malformed URL (%s)', (_label, url) => {
    expect(parseLandingPageUrl(url).ok).toBe(false);
    expect(userSuppliedInputSchema.safeParse({ landingPageUrl: url }).success).toBe(false);
    expect(
      createGoalPayloadSchema.safeParse({
        title: 'Campaign',
        userSuppliedInput: { landingPageUrl: url },
      }).success
    ).toBe(false);
  });

  it('rejects URLs longer than 2048', () => {
    const url = `https://operator-entered.example/${'a'.repeat(LANDING_PAGE_URL_MAX)}`;
    expect(url.length).toBeGreaterThan(LANDING_PAGE_URL_MAX);
    expect(parseLandingPageUrl(url).ok).toBe(false);
  });

  it('rejects workspaceId/userId on userSuppliedInput (auth is not a command field)', () => {
    expect(
      userSuppliedInputSchema.safeParse({
        landingPageUrl: LANDING,
        workspaceId: 'seedbed',
        userId: USER_ID,
      }).success
    ).toBe(false);
  });
});

describe('create_goal userSuppliedInput (additive)', () => {
  it('keeps existing create_goal payloads valid without a URL', () => {
    expect(validateCommandPayload('create_goal', { title: 'Launch Q4 Product Campaign' })).toBe(true);
    const command = buildCreateGoalCommand({ title: 'Launch Q4 Product Campaign' });
    expect(commandEnvelopeSchema.safeParse(command).success).toBe(true);
    expect(command.payload.userSuppliedInput).toBeUndefined();
  });

  it('accepts operator-entered landingPageUrl on the campaign-goal command', () => {
    const payload = {
      title: 'Launch Q4 Product Campaign',
      userSuppliedInput: { landingPageUrl: LANDING },
    };
    expect(createGoalPayloadSchema.safeParse(payload).success).toBe(true);
    expect(validateCommandPayload('create_goal', payload)).toBe(true);
  });
});

describe('sourced research artifact', () => {
  it('accepts a versioned sourced artifact', () => {
    const artifact = sourcedArtifact();
    expect(researchArtifactSchema.safeParse(artifact).success).toBe(true);
    expect(researchFindingsAreSourced(artifact.sources, artifact.findings)).toBe(true);
    expect(canAcceptResearchArtifact(artifact)).toBe(true);
  });

  it('rejects missing sources on a review ask', () => {
    const review = sourcedReview();
    review.sources = [];
    expect(researchReviewAskSchema.safeParse(review).success).toBe(false);
  });

  it('rejects findings that cite unknown sourceIds', () => {
    const review = sourcedReview();
    review.findings = [{ id: 'f1', text: 'Unsourced claim', sourceIds: ['missing'] }];
    expect(researchReviewAskSchema.safeParse(review).success).toBe(false);
    expect(researchFindingsAreSourced(sourcedReview().sources, review.findings)).toBe(false);
  });

  it('rejects findings with empty sourceIds', () => {
    const review = {
      ...sourcedReview(),
      findings: [{ id: 'f1', text: 'Claim', sourceIds: [] }],
    };
    expect(researchReviewAskSchema.safeParse(review).success).toBe(false);
  });

  it('does not treat failed or invalidated artifacts as acceptable', () => {
    expect(canAcceptResearchArtifact(sourcedArtifact('failed'))).toBe(false);
    expect(canAcceptResearchArtifact(sourcedArtifact('invalidated'))).toBe(false);
    expect(canAcceptResearchArtifact(sourcedArtifact('accepted'))).toBe(true);
  });

  it('does not treat empty findings as sourced research (context is not research)', () => {
    expect(researchFindingsAreSourced([{ sourceId: 'page-1' }], [])).toBe(false);
  });
});

describe('askType compatibility', () => {
  it('keeps clarify, plan_approval, and action_approval asks valid without research', () => {
    expect(askPayloadSchema.safeParse(clarifyAsk).success).toBe(true);
    expect(validateEventPayload('ask', clarifyAsk)).toBe(true);
    expect(
      askPayloadSchema.safeParse({
        askId: ASK_ID,
        askType: 'plan_approval',
        title: 'Approve plan',
        blocking: true,
        risk: 'medium',
        questions: [{ id: 'approval', type: 'confirm', label: 'Approve?' }],
      }).success
    ).toBe(true);
    expect(
      askPayloadSchema.safeParse({
        askId: ASK_ID,
        askType: 'action_approval',
        title: 'Approve tool',
        blocking: true,
        risk: 'high',
        questions: [{ id: 'approval', type: 'choice', label: 'Action' }],
      }).success
    ).toBe(true);
  });

  it('rejects research on clarify/plan/action asks', () => {
    expect(askPayloadSchema.safeParse({ ...clarifyAsk, research: sourcedReview() }).success).toBe(false);
  });

  it('requires payload.research on research_review and forbids costEffect/defaults', () => {
    expect(
      askPayloadSchema.safeParse({
        askId: ASK_ID,
        askType: 'research_review',
        title: 'Review',
        blocking: true,
        risk: 'high',
        questions: [{ id: 'research-accept', type: 'confirm', label: 'Accept?' }],
      }).success
    ).toBe(false);

    const withCost = researchAsk();
    (withCost as { costEffect?: unknown }).costEffect = {
      current: 0,
      proposed: 10,
      currency: 'USD',
      impact: 'spend',
    };
    expect(askPayloadSchema.safeParse(withCost).success).toBe(false);

    const withDefault = researchAsk();
    withDefault.questions = [{ ...withDefault.questions[0], default: LANDING }];
    expect(askPayloadSchema.safeParse(withDefault).success).toBe(false);

    const withExpireDefault = researchAsk();
    withExpireDefault.onExpire = 'default';
    expect(askPayloadSchema.safeParse(withExpireDefault).success).toBe(false);
  });

  it('accepts a Hub-authored research_review ask', () => {
    const payload = researchAsk();
    expect(askPayloadSchema.safeParse(payload).success).toBe(true);
    expect(validateEventPayload('ask', payload)).toBe(true);
    const event = buildResearchReviewAskEvent(
      { askId: ASK_ID, research: sourcedReview() },
      { seq: 4, threadId: THREAD_ID }
    );
    expect(eventEnvelopeSchema.safeParse(event).success).toBe(true);
    expect(event.payload.askType).toBe('research_review');
    expect(event.payload.research?.verb).toBe('research.accept');
    expect(event.payload.costEffect).toBeUndefined();
    expect(event.fallbackText).toContain('does not grant spend');
  });
});

describe('answer_ask research acceptance and edit invalidation', () => {
  it('keeps existing approve/reject/edit answers valid without researchAcceptance', () => {
    expect(answerAskPayloadSchema.safeParse({ askId: ASK_ID, choice: 'approve' }).success).toBe(true);
    expect(
      answerAskPayloadSchema.safeParse({
        askId: ASK_ID,
        choice: 'edit',
        values: { budget: 100 },
        edit: 'Reduced budget',
      }).success
    ).toBe(true);
  });

  it('accepts only when researchAcceptance matches the current revision', () => {
    const ask = researchAsk();
    const matching = {
      askId: ASK_ID,
      choice: 'approve' as const,
      researchAcceptance: { artifactId: ARTIFACT_ID, version: 1, inputRevision: REVISION },
    };
    expect(answerAskPayloadSchema.safeParse(matching).success).toBe(true);
    const result = evaluateResearchReviewAnswer(ask, matching);
    expect(result.outcome).toBe('accepted');
    expect(result.grantsSpend).toBe(false);
    expect(researchAcceptanceMatches(ask.research!, matching.researchAcceptance)).toBe(true);
  });

  it('treats missing or stale revisions as mismatch, not acceptance', () => {
    const ask = researchAsk();
    expect(evaluateResearchReviewAnswer(ask, { askId: ASK_ID, choice: 'approve' }).outcome).toBe(
      'mismatch'
    );
    expect(
      evaluateResearchReviewAnswer(ask, {
        askId: ASK_ID,
        choice: 'approve',
        researchAcceptance: { artifactId: ARTIFACT_ID, version: 2, inputRevision: REVISION },
      }).outcome
    ).toBe('mismatch');
    expect(
      evaluateResearchReviewAnswer(ask, {
        askId: ASK_ID,
        choice: 'approve',
        researchAcceptance: { artifactId: ARTIFACT_ID, version: 1, inputRevision: 'other-revision' },
      }).outcome
    ).toBe('mismatch');
  });

  it('invalidates on edit and allows a replacement operator URL only on edit', () => {
    const ask = researchAsk();
    const edit = {
      askId: ASK_ID,
      choice: 'edit' as const,
      researchAcceptance: { artifactId: ARTIFACT_ID, version: 1, inputRevision: REVISION },
      userSuppliedInput: { landingPageUrl: 'https://operator-entered.example/new-path' },
    };
    expect(answerAskPayloadSchema.safeParse(edit).success).toBe(true);
    const result = evaluateResearchReviewAnswer(ask, edit);
    expect(result.outcome).toBe('invalidated');
    expect(result.grantsSpend).toBe(false);
    expect(result.message).toMatch(/new userSuppliedInput/);

    expect(
      answerAskPayloadSchema.safeParse({
        askId: ASK_ID,
        choice: 'approve',
        userSuppliedInput: { landingPageUrl: LANDING },
      }).success
    ).toBe(false);
  });

  it('leaves the artifact unaccepted on reject', () => {
    const result = evaluateResearchReviewAnswer(researchAsk(), {
      askId: ASK_ID,
      choice: 'reject',
      researchAcceptance: { artifactId: ARTIFACT_ID, version: 1, inputRevision: REVISION },
    });
    expect(result.outcome).toBe('rejected');
    expect(result.grantsSpend).toBe(false);
  });

  it('does not apply research evaluation to clarify asks', () => {
    expect(
      evaluateResearchReviewAnswer(clarifyAsk, { askId: ASK_ID, choice: 'approve' }).outcome
    ).toBe('invalid');
  });
});

describe('builders and mapping isolation', () => {
  it('does not prefill userSuppliedInput on create_goal', () => {
    const command = buildCreateGoalCommand({ title: 'Campaign' });
    expect(command.payload).not.toHaveProperty('userSuppliedInput');
  });

  it('builds research review answers without inventing a URL', () => {
    const command = buildAnswerAskCommand({
      askId: ASK_ID,
      choice: 'approve',
      researchAcceptance: { artifactId: ARTIFACT_ID, version: 1, inputRevision: REVISION },
    });
    expect(command.payload.userSuppliedInput).toBeUndefined();
    expect(commandEnvelopeSchema.safeParse(command).success).toBe(true);
  });

  it('does not map model research.accept/gather tool calls to approval cards', () => {
    const event = mapToolCallToEvent(
      {
        type: 'tool_call',
        tool: 'research.accept',
        parameters: { landingPageUrl: 'https://model-invented.example/' },
        needsApproval: true,
        risk: 'high',
      },
      { seq: 9 }
    );
    expect(event.type).toBe('message');
    expect(event.payload).toMatchObject({ source: 'system' });
    expect(eventEnvelopeSchema.safeParse(event).success).toBe(true);
  });

  it('leaves clarify and plan mapping unchanged', () => {
    const clarify = mapClarifyToEvent(
      {
        type: 'clarify',
        reason: 'Need budget',
        questions: [{ id: 'budget', text: 'Daily budget?', type: 'number' }],
      },
      { seq: 2 }
    );
    expect(clarify.payload.askType).toBe('clarify');
    expect(clarify.payload.research).toBeUndefined();
    expect(eventEnvelopeSchema.safeParse(clarify).success).toBe(true);
    expect(validateEventPayload('ask', clarify.payload)).toBe(true);

    const plan = mapPlanToEvent(
      {
        type: 'plan',
        title: 'Plan',
        description: 'A plan',
        steps: [{ id: 's1', title: 'Step', description: 'Do it' }],
      },
      { seq: 3 }
    );
    expect(plan.payload.askType).toBe('plan_approval');
    expect(plan.payload.research).toBeUndefined();
    expect(validateEventPayload('ask', plan.payload)).toBe(true);
  });
});

describe('docs/research examples', () => {
  it('validate committed JSON examples', () => {
    const files = [
      ['create-goal-with-landing.example.json', (value: unknown) => commandEnvelopeSchema.safeParse(value)],
      ['research-artifact.example.json', (value: unknown) => researchArtifactSchema.safeParse(value)],
      ['research-review-ask.example.json', (value: unknown) => eventEnvelopeSchema.safeParse(value)],
      ['research-review-answer-approve.example.json', (value: unknown) => commandEnvelopeSchema.safeParse(value)],
      ['research-review-answer-edit.example.json', (value: unknown) => commandEnvelopeSchema.safeParse(value)],
    ] as const;

    for (const [name, parse] of files) {
      const raw = JSON.parse(readFileSync(join(docsDir, name), 'utf8')) as unknown;
      const result = parse(raw);
      if (!result.success) {
        console.error(name, result.error);
      }
      expect(result.success).toBe(true);
    }

    const goal = JSON.parse(
      readFileSync(join(docsDir, 'create-goal-with-landing.example.json'), 'utf8')
    ) as { type: string; payload: unknown };
    expect(validateCommandPayload(goal.type, goal.payload)).toBe(true);

    const ask = JSON.parse(
      readFileSync(join(docsDir, 'research-review-ask.example.json'), 'utf8')
    ) as { type: string; payload: unknown };
    expect(validateEventPayload(ask.type, ask.payload)).toBe(true);

    const approve = JSON.parse(
      readFileSync(join(docsDir, 'research-review-answer-approve.example.json'), 'utf8')
    ) as { type: string; payload: unknown };
    expect(validateCommandPayload(approve.type, approve.payload)).toBe(true);

    const edit = JSON.parse(
      readFileSync(join(docsDir, 'research-review-answer-edit.example.json'), 'utf8')
    ) as { type: string; payload: unknown };
    expect(validateCommandPayload(edit.type, edit.payload)).toBe(true);
  });
});
