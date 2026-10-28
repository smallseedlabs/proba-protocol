/**
 * Tests for context bridge schemas (0.4.0).
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  stepTypeSchema,
  contextNeedSchema,
  actAsAssertionClaimsSchema,
  contextAuditDetailsSchema,
  brainContextAttachedDetailsSchema,
  KNOWN_GAP_CODES,
  ACT_AS_ASSERTION_MAX_TTL_SECONDS,
  validateContextRequest,
  validateContextPacket,
  validateActAsAssertionClaims,
} from '../../src/schemas/context.js';
import { validateAuditEvent } from '../../src/schemas/audit.js';
import { buildAuditEvent } from '../../src/builders/audit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '../../docs/context');

const TRACE = '550e8400-e29b-41d4-a716-446655440000';
const USER = '660e8400-e29b-41d4-a716-446655440001';
const GOAL = '770e8400-e29b-41d4-a716-446655440002';
const THREAD = '880e8400-e29b-41d4-a716-446655440003';
const PACKET = '990e8400-e29b-41d4-a716-446655440004';
const HASH = 'a'.repeat(64);

const validRequest = {
  traceId: TRACE,
  workspaceId: 'seedbed',
  userId: USER,
  goalId: GOAL,
  threadId: THREAD,
  stepId: 'step-1',
  stepType: 'propose_budget' as const,
  budgetTokens: 4000,
  profile: 'default',
};

const validPacket = {
  packetId: PACKET,
  packetHash: HASH,
  traceId: TRACE,
  workspaceId: 'seedbed',
  userId: USER,
  goalId: GOAL,
  stepId: 'step-1',
  configVersion: '1',
  templateVersion: '1',
  sections: [
    {
      kind: 'policy' as const,
      priority: 0,
      tokens: 40,
      items: [
        {
          itemId: 'pol-1',
          sourceRef: { source: 'policy', id: 'default' },
          trust: 'system' as const,
          text: 'Spend caps require approval above 100 GBP.',
          observedAt: '2026-10-28T00:00:00.000Z',
        },
      ],
    },
  ],
  gaps: [
    {
      code: 'no_analytics_for_campaign',
      source: 'analytics',
      reason: 'No campaign metrics for this goal in the last 7 days.',
      suggestedQuestion: 'Which campaign should I raise the budget on?',
    },
  ],
  manifest: {
    sources: {
      analytics: {
        requested: true,
        returned: 0,
        included: 0,
        dropped: 0,
        droppedReasons: {},
        cacheHit: false,
        latencyMs: 12,
        tokens: 0,
      },
    },
    totals: {
      returned: 1,
      included: 1,
      dropped: 0,
      tokens: 40,
      gaps: 1,
      latencyMs: 45,
    },
    droppedItemIds: [],
  },
};

describe('StepType', () => {
  it('accepts every documented step type', () => {
    for (const t of [
      'interpret_message',
      'clarify',
      'plan_goal',
      'propose_budget',
      'handle_approval',
      'launch_campaign',
      'review_performance',
      'explain_decision',
    ]) {
      expect(stepTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it('rejects unknown step types', () => {
    expect(stepTypeSchema.safeParse('free_form').success).toBe(false);
  });
});

describe('ContextNeed', () => {
  it('accepts each need kind within hard limits', () => {
    expect(
      contextNeedSchema.safeParse({ kind: 'memory_search', query: 'budget', limit: 5 }).success
    ).toBe(true);
    expect(
      contextNeedSchema.safeParse({
        kind: 'analytics_compare',
        campaignIds: [GOAL],
        metric: 'spend',
        window: '7d',
      }).success
    ).toBe(true);
    expect(contextNeedSchema.safeParse({ kind: 'audit_trace', traceId: TRACE }).success).toBe(true);
    expect(
      contextNeedSchema.safeParse({ kind: 'conversation_before', cursor: 'c1', limit: 10 }).success
    ).toBe(true);
  });

  it('rejects over-limit needs and free-form kinds', () => {
    expect(
      contextNeedSchema.safeParse({ kind: 'memory_search', query: 'x'.repeat(501), limit: 5 }).success
    ).toBe(false);
    expect(
      contextNeedSchema.safeParse({ kind: 'memory_search', query: 'ok', limit: 21 }).success
    ).toBe(false);
    expect(
      contextNeedSchema.safeParse({
        kind: 'analytics_compare',
        campaignIds: Array.from({ length: 11 }, (_, i) => {
          const n = (10 + i).toString(16).padStart(12, '0');
          return `770e8400-e29b-41d4-a716-${n}`;
        }),
        metric: 'spend',
        window: '7d',
      }).success
    ).toBe(false);
    expect(contextNeedSchema.safeParse({ kind: 'sql', query: 'SELECT 1' }).success).toBe(false);
  });
});

describe('ContextRequest and ContextPacket', () => {
  it('accepts valid request and packet examples', () => {
    expect(validateContextRequest(validRequest).success).toBe(true);
    expect(validateContextPacket(validPacket).success).toBe(true);
  });

  it('rejects a packet with a bad hash or missing sections shape', () => {
    expect(validateContextPacket({ ...validPacket, packetHash: 'not-hex' }).success).toBe(false);
    expect(validateContextPacket({ ...validPacket, sections: 'nope' }).success).toBe(false);
  });

  it('lists the known gap codes', () => {
    expect(KNOWN_GAP_CODES).toContain('no_analytics_for_campaign');
    expect(KNOWN_GAP_CODES).toContain('source_timeout');
  });

  it('validates the docs JSON examples', () => {
    const request = JSON.parse(readFileSync(join(docsDir, 'context-request.example.json'), 'utf8'));
    const packet = JSON.parse(readFileSync(join(docsDir, 'context-packet.example.json'), 'utf8'));
    const assertion = JSON.parse(readFileSync(join(docsDir, 'act-as-assertion.example.json'), 'utf8'));
    expect(validateContextRequest(request).success).toBe(true);
    expect(validateContextPacket(packet).success).toBe(true);
    expect(validateActAsAssertionClaims(assertion).success).toBe(true);
  });
});

describe('ActAsAssertionClaims', () => {
  const base = {
    iss: 'proba-hub' as const,
    aud: ['proba-context', 'proba-audit', 'proba-memory', 'proba-hub'] as const,
    sub: USER,
    workspaceId: 'seedbed',
    goalId: GOAL,
    threadId: THREAD,
    scopes: ['context:build'],
    iat: 1_700_000_000,
    exp: 1_700_000_000 + ACT_AS_ASSERTION_MAX_TTL_SECONDS,
    jti: 'jti-1',
  };

  it('accepts a well-formed assertion within the TTL', () => {
    expect(actAsAssertionClaimsSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a TTL longer than 5 minutes and a wrong issuer', () => {
    expect(
      actAsAssertionClaimsSchema.safeParse({
        ...base,
        exp: base.iat + ACT_AS_ASSERTION_MAX_TTL_SECONDS + 1,
      }).success
    ).toBe(false);
    expect(actAsAssertionClaimsSchema.safeParse({ ...base, iss: 'proba-context' }).success).toBe(
      false
    );
  });
});

describe('context audit details', () => {
  it('accepts counts-only details and brain.context_attached details', () => {
    expect(
      contextAuditDetailsSchema.safeParse({
        packetId: PACKET,
        workspaceId: 'seedbed',
        userId: USER,
        goalId: GOAL,
        stepId: 'step-1',
        source: 'memory',
        counts: { returned: 3, included: 2 },
      }).success
    ).toBe(true);
    expect(
      brainContextAttachedDetailsSchema.safeParse({
        packetId: PACKET,
        packetHash: HASH,
        stepId: 'step-1',
        stepType: 'propose_budget',
        configVersion: '1',
      }).success
    ).toBe(true);
  });

  it('rejects unknown keys so item text cannot sneak in', () => {
    expect(
      contextAuditDetailsSchema.safeParse({ packetId: PACKET, text: 'secret' }).success
    ).toBe(false);
  });

  it('builds valid audit events for context actions with those details', () => {
    const event = buildAuditEvent({
      traceId: TRACE,
      workspaceId: 'seedbed',
      actor: { type: 'service', id: 'proba-context' },
      service: 'proba-context',
      action: 'context.built',
      category: 'data_access',
      outcome: 'success',
      details: {
        packetId: PACKET,
        packetHash: HASH,
        stepId: 'step-1',
        counts: { tokens: 40, gaps: 1 },
      },
    });
    expect(validateAuditEvent(event).success).toBe(true);
  });
});
