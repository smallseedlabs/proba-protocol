/**
 * Tests for audit schemas, builder, guard and utilities.
 */

import { describe, it, expect } from '@jest/globals';
import {
  auditEventSchema,
  storedAuditEventSchema,
  validateAuditEvent,
  validateStoredAuditEvent,
} from '../../src/schemas/audit.js';
import { buildAuditEvent, generateSpanId } from '../../src/builders/audit.js';
import { isAuditEvent, canonicalizeAuditEvent, AUDIT_ACTIONS } from '../../src/utils/audit.js';
import { auditCategorySchema, spanIdSchema } from '../../src/schemas/audit.js';

const TRACE_ID = '550e8400-e29b-41d4-a716-446655440000';

const minimalDraft = {
  traceId: TRACE_ID,
  workspaceId: 'default',
  actor: { type: 'service' as const, id: 'hub' },
  service: 'hub',
  action: 'command.received',
  category: 'command' as const,
  outcome: 'success' as const,
};

const fullEvent = {
  version: 1,
  eventId: '660e8400-e29b-41d4-a716-446655440000',
  traceId: TRACE_ID,
  spanId: 'a1b2c3d4e5f60718',
  parentSpanId: '0011223344556677',
  workspaceId: 'default',
  userId: '770e8400-e29b-41d4-a716-446655440000',
  goalId: '880e8400-e29b-41d4-a716-446655440000',
  threadId: '990e8400-e29b-41d4-a716-446655440000',
  campaignId: 'cmp_123',
  actor: { type: 'brain', id: 'mock-brain' },
  service: 'hub',
  action: 'brain.llm_call',
  category: 'brain',
  target: { type: 'goal', id: '880e8400-e29b-41d4-a716-446655440000' },
  outcome: 'partial',
  errorCode: 'TIMEOUT',
  errorMessage: 'Upstream timed out after retry',
  riskLevel: 'low',
  cost: { tokensIn: 1200, tokensOut: 300, currency: 'USD', amount: 0.0123 },
  durationMs: 842,
  occurredAt: '2026-10-25T21:00:00.000Z',
  details: { model: 'example', retries: 1 },
  tags: ['llm', 'retry'],
};

describe('Audit Schemas', () => {
  describe('auditEventSchema', () => {
    it('should validate a fully populated event', () => {
      expect(auditEventSchema.safeParse(fullEvent).success).toBe(true);
    });

    it('should validate an event with only required fields', () => {
      const event = buildAuditEvent(minimalDraft);
      expect(auditEventSchema.safeParse(event).success).toBe(true);
    });

    it.each(['eventId', 'traceId', 'spanId', 'workspaceId', 'actor', 'service', 'action', 'category', 'outcome', 'occurredAt', 'details', 'version'])(
      'should reject when %s is missing',
      (field) => {
        const { [field]: _removed, ...rest } = fullEvent as Record<string, unknown>;
        void _removed;
        expect(auditEventSchema.safeParse(rest).success).toBe(false);
      }
    );

    it('should reject unknown version', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, version: 2 }).success).toBe(false);
    });

    it('should reject non-uuid eventId and traceId', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, eventId: 'abc' }).success).toBe(false);
      expect(auditEventSchema.safeParse({ ...fullEvent, traceId: 'abc' }).success).toBe(false);
    });

    it('should reject invalid enum values', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, category: 'other' }).success).toBe(false);
      expect(auditEventSchema.safeParse({ ...fullEvent, outcome: 'ok' }).success).toBe(false);
      expect(auditEventSchema.safeParse({ ...fullEvent, riskLevel: 'critical' }).success).toBe(false);
      expect(auditEventSchema.safeParse({ ...fullEvent, actor: { type: 'robot', id: 'x' } }).success).toBe(false);
    });

    it('should accept every documented category and outcome', () => {
      for (const category of auditCategorySchema.options) {
        expect(auditEventSchema.safeParse({ ...fullEvent, category }).success).toBe(true);
      }
      for (const outcome of ['success', 'failure', 'denied', 'partial']) {
        expect(auditEventSchema.safeParse({ ...fullEvent, outcome }).success).toBe(true);
      }
    });

    it('should require dotted lower-case action names', () => {
      for (const action of ['command.received', 'brain.llm_call', 'policy.denied', 'a.b.c']) {
        expect(auditEventSchema.safeParse({ ...fullEvent, action }).success).toBe(true);
      }
      for (const action of ['received', 'Command.Received', 'command.', '.received', 'command received', '']) {
        expect(auditEventSchema.safeParse({ ...fullEvent, action }).success).toBe(false);
      }
    });

    it('should accept OpenTelemetry-style span ids and parent span ids', () => {
      for (const id of ['a1b2c3d4e5f60718', '0000000000000001', 'ffffffffffffffff']) {
        expect(auditEventSchema.safeParse({ ...fullEvent, spanId: id }).success).toBe(true);
        expect(auditEventSchema.safeParse({ ...fullEvent, parentSpanId: id }).success).toBe(true);
      }
    });

    it('should reject span ids that are uppercase, the wrong length, non-hex or all zeros', () => {
      const bad = [
        'A1B2C3D4E5F60718', // uppercase
        'a1b2c3d4e5f6071', // 15 chars
        'a1b2c3d4e5f607180', // 17 chars
        'g1b2c3d4e5f60718', // not hex
        '0000000000000000', // all zeros
        '',
        'abc',
      ];
      for (const id of bad) {
        expect(auditEventSchema.safeParse({ ...fullEvent, spanId: id }).success).toBe(false);
        expect(auditEventSchema.safeParse({ ...fullEvent, parentSpanId: id }).success).toBe(false);
        expect(spanIdSchema.safeParse(id).success).toBe(false);
      }
    });

    it('should keep traceId a UUID that maps to a 32-hex OpenTelemetry trace id', () => {
      expect(TRACE_ID.replace(/-/g, '')).toMatch(/^[0-9a-f]{32}$/);
      expect(auditEventSchema.safeParse({ ...fullEvent, traceId: TRACE_ID.replace(/-/g, '') }).success).toBe(false);
    });

    it('should accept only UTC timestamps with a trailing Z', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, occurredAt: new Date().toISOString() }).success).toBe(true);
      expect(auditEventSchema.safeParse({ ...fullEvent, occurredAt: '2026-10-25T21:00:00.000+01:00' }).success).toBe(false);
      expect(auditEventSchema.safeParse({ ...fullEvent, occurredAt: '2026-10-25T21:00:00' }).success).toBe(false);
    });

    it('should accept any non-empty campaignId (not a uuid)', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, campaignId: '23851234567890123' }).success).toBe(true);
      expect(auditEventSchema.safeParse({ ...fullEvent, campaignId: '' }).success).toBe(false);
    });

    it('should reject malformed timestamps', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, occurredAt: 'yesterday' }).success).toBe(false);
    });

    it('should reject negative durations and token counts', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, durationMs: -1 }).success).toBe(false);
      expect(
        auditEventSchema.safeParse({ ...fullEvent, cost: { tokensIn: -1 } }).success
      ).toBe(false);
      expect(
        auditEventSchema.safeParse({ ...fullEvent, cost: { tokensIn: 1.5 } }).success
      ).toBe(false);
    });

    it('should require cost currency and amount together', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, cost: { tokensIn: 5, tokensOut: 5 } }).success).toBe(true);
      expect(auditEventSchema.safeParse({ ...fullEvent, cost: { currency: 'USD' } }).success).toBe(false);
      expect(auditEventSchema.safeParse({ ...fullEvent, cost: { amount: 1 } }).success).toBe(false);
      expect(auditEventSchema.safeParse({ ...fullEvent, cost: { currency: 'US', amount: 1 } }).success).toBe(false);
    });

    it('should accept arbitrary details but require an object', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, details: { nested: { a: [1, 2] } } }).success).toBe(true);
      expect(auditEventSchema.safeParse({ ...fullEvent, details: 'text' }).success).toBe(false);
      expect(auditEventSchema.safeParse({ ...fullEvent, details: null }).success).toBe(false);
    });

    it('should not reject secret-like keys in details (documentation-only rule)', () => {
      const event = { ...fullEvent, details: { apiKey: 'redacted', password: 'redacted' } };
      expect(auditEventSchema.safeParse(event).success).toBe(true);
    });

    it('should reject empty tags', () => {
      expect(auditEventSchema.safeParse({ ...fullEvent, tags: [''] }).success).toBe(false);
    });
  });

  describe('validateAuditEvent / isAuditEvent', () => {
    it('should return a result object with the parsed event', () => {
      const result = validateAuditEvent(fullEvent);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.eventId).toBe(fullEvent.eventId);
    });

    it('should return errors for invalid input', () => {
      const result = validateAuditEvent({ ...fullEvent, action: 'bad' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].path).toEqual(['action']);
    });

    it('should guard correctly', () => {
      expect(isAuditEvent(fullEvent)).toBe(true);
      expect(isAuditEvent(buildAuditEvent(minimalDraft))).toBe(true);
      expect(isAuditEvent(null)).toBe(false);
      expect(isAuditEvent('string')).toBe(false);
      expect(isAuditEvent({})).toBe(false);
      expect(isAuditEvent({ ...fullEvent, version: 9 })).toBe(false);
    });
  });

  describe('buildAuditEvent', () => {
    it('should fill version, eventId, spanId, occurredAt and details', () => {
      const before = Date.now();
      const event = buildAuditEvent(minimalDraft);
      const after = Date.now();

      expect(event.version).toBe(1);
      expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(event.spanId).toMatch(/^[0-9a-f]{16}$/);
      expect(event.details).toEqual({});
      expect(Date.parse(event.occurredAt)).toBeGreaterThanOrEqual(before);
      expect(Date.parse(event.occurredAt)).toBeLessThanOrEqual(after);
      expect(event.parentSpanId).toBeUndefined();
    });

    it('should generate a distinct eventId and spanId each call', () => {
      const a = buildAuditEvent(minimalDraft);
      const b = buildAuditEvent(minimalDraft);
      expect(a.eventId).not.toBe(b.eventId);
      expect(a.spanId).not.toBe(b.spanId);
    });

    it('should keep explicit values', () => {
      const event = buildAuditEvent({
        ...minimalDraft,
        eventId: fullEvent.eventId,
        spanId: 'abcdef0123456789',
        occurredAt: '2026-01-01T00:00:00.000Z',
        details: { a: 1 },
        tags: ['x'],
        parentSpanId: '0123456789abcdef',
      });
      expect(event.eventId).toBe(fullEvent.eventId);
      expect(event.spanId).toBe('abcdef0123456789');
      expect(event.occurredAt).toBe('2026-01-01T00:00:00.000Z');
      expect(event.details).toEqual({ a: 1 });
      expect(event.tags).toEqual(['x']);
      expect(event.parentSpanId).toBe('0123456789abcdef');
    });

    it('should not validate: invalid input passes through for validateAuditEvent to catch', () => {
      const event = buildAuditEvent({ ...minimalDraft, traceId: 'not-a-uuid' });
      expect(validateAuditEvent(event).success).toBe(false);
    });

    it('generateSpanId should return 16 hex characters', () => {
      for (let i = 0; i < 50; i++) {
        const id = generateSpanId();
        expect(id).toMatch(/^[0-9a-f]{16}$/);
        expect(id).not.toBe('0000000000000000');
        expect(spanIdSchema.safeParse(id).success).toBe(true);
      }
    });
  });

  describe('storedAuditEventSchema', () => {
    const hash = 'a'.repeat(64);
    const stored = {
      ...fullEvent,
      prevHash: null,
      hash,
      ingestedAt: '2026-10-25T21:00:01.000Z',
      schemaVersion: 1,
    };

    it('should validate a stored event, including the first in the chain (null prevHash)', () => {
      expect(storedAuditEventSchema.safeParse(stored).success).toBe(true);
      expect(validateStoredAuditEvent({ ...stored, prevHash: 'b'.repeat(64) }).success).toBe(true);
    });

    it('should require the chain fields', () => {
      for (const field of ['prevHash', 'hash', 'ingestedAt', 'schemaVersion']) {
        const { [field]: _removed, ...rest } = stored as Record<string, unknown>;
        void _removed;
        expect(storedAuditEventSchema.safeParse(rest).success).toBe(false);
      }
    });

    it('should reject malformed hashes', () => {
      expect(storedAuditEventSchema.safeParse({ ...stored, hash: 'xyz' }).success).toBe(false);
      expect(storedAuditEventSchema.safeParse({ ...stored, prevHash: 'A'.repeat(64) }).success).toBe(false);
    });

    it('should not be accepted from producers as a plain AuditEvent with chain fields stripped', () => {
      expect(auditEventSchema.safeParse(stored).success).toBe(true); // extra keys are stripped, not rejected
      const parsed = auditEventSchema.parse(stored) as Record<string, unknown>;
      expect(parsed.hash).toBeUndefined();
      expect(parsed.prevHash).toBeUndefined();
    });
  });

  describe('canonicalizeAuditEvent', () => {
    it('should be independent of key order', () => {
      const a = buildAuditEvent({ ...minimalDraft, eventId: fullEvent.eventId, spanId: '1111111111111111', occurredAt: '2026-01-01T00:00:00.000Z', details: { b: 1, a: { d: 1, c: 2 } } });
      const b = buildAuditEvent({ details: { a: { c: 2, d: 1 }, b: 1 }, occurredAt: '2026-01-01T00:00:00.000Z', spanId: '1111111111111111', eventId: fullEvent.eventId, outcome: 'success', category: 'command', action: 'command.received', service: 'hub', actor: { id: 'hub', type: 'service' }, workspaceId: 'default', traceId: TRACE_ID });
      expect(canonicalizeAuditEvent(a)).toBe(canonicalizeAuditEvent(b));
    });

    it('should sort keys, omit undefined and preserve array order', () => {
      const event = buildAuditEvent({ ...minimalDraft, eventId: fullEvent.eventId, spanId: '1111111111111111', occurredAt: '2026-01-01T00:00:00.000Z', details: { z: [3, 1, 2], a: undefined }, tags: ['b', 'a'], userId: undefined });
      const text = canonicalizeAuditEvent(event);
      expect(text).toContain('"details":{"z":[3,1,2]}');
      expect(text).toContain('"tags":["b","a"]');
      expect(text).not.toContain('userId');
      expect(text.indexOf('"action"')).toBeLessThan(text.indexOf('"workspaceId"'));
      expect(text).not.toMatch(/\s/);
    });

    it('should change when any value changes', () => {
      const event = buildAuditEvent(minimalDraft);
      expect(canonicalizeAuditEvent(event)).not.toBe(canonicalizeAuditEvent({ ...event, outcome: 'failure' }));
    });
  });

  describe('AUDIT_ACTIONS', () => {
    it('should list actions for every category, each prefixed by its category', () => {
      for (const category of auditCategorySchema.options) {
        const actions = AUDIT_ACTIONS[category];
        expect(actions.length).toBeGreaterThan(0);
        for (const action of actions) {
          expect(action.startsWith(`${category}.`)).toBe(true);
          expect(validateAuditEvent({ ...fullEvent, category, action }).success).toBe(true);
        }
      }
    });

    it('should not enforce the list: other action names remain valid', () => {
      expect(validateAuditEvent({ ...fullEvent, action: 'command.something_new' }).success).toBe(true);
    });
  });
});
