/**
 * Tests for event schemas.
 */

import { describe, it, expect } from '@jest/globals';
import {
  eventEnvelopeSchema,
  messagePayloadSchema,
  askPayloadSchema,
  statusPayloadSchema,
  errorPayloadSchema,
  validateEventPayload,
} from '../../src/schemas/event.js';

describe('Event Schemas', () => {
  describe('messagePayloadSchema', () => {
    it('should validate valid message', () => {
      const valid = {
        text: 'Hello from brain',
        source: 'brain',
      };
      expect(messagePayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate with replyTo', () => {
      const valid = {
        text: 'Reply message',
        source: 'system',
        replyTo: 'msg-123',
      };
      expect(messagePayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject empty text', () => {
      const invalid = { text: '', source: 'brain' };
      expect(messagePayloadSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject invalid source', () => {
      const invalid = { text: 'Hello', source: 'unknown' };
      expect(messagePayloadSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('askPayloadSchema', () => {
    it('should validate valid ask', () => {
      const valid = {
        askId: '550e8400-e29b-41d4-a716-446655440000',
        askType: 'clarify',
        title: 'Need more info',
        blocking: true,
        risk: 'low',
        questions: [
          {
            id: 'q1',
            type: 'text',
            label: 'What is your budget?',
          },
        ],
      };
      expect(askPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate with cost effect', () => {
      const valid = {
        askId: '550e8400-e29b-41d4-a716-446655440000',
        askType: 'action_approval',
        title: 'Approve budget increase',
        blocking: true,
        risk: 'high',
        costEffect: {
          current: 100,
          proposed: 120,
          currency: 'USD',
          impact: '+20%',
        },
        questions: [
          {
            id: 'q1',
            type: 'confirm',
            label: 'Approve this change?',
          },
        ],
      };
      expect(askPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject more than 3 questions', () => {
      const invalid = {
        askId: '550e8400-e29b-41d4-a716-446655440000',
        askType: 'clarify',
        title: 'Too many questions',
        blocking: true,
        risk: 'low',
        questions: [
          { id: 'q1', type: 'text', label: 'Q1' },
          { id: 'q2', type: 'text', label: 'Q2' },
          { id: 'q3', type: 'text', label: 'Q3' },
          { id: 'q4', type: 'text', label: 'Q4' },
        ],
      };
      expect(askPayloadSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject empty questions array', () => {
      const invalid = {
        askId: '550e8400-e29b-41d4-a716-446655440000',
        askType: 'clarify',
        title: 'No questions',
        blocking: true,
        risk: 'low',
        questions: [],
      };
      expect(askPayloadSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('statusPayloadSchema', () => {
    it('should validate basic status', () => {
      const valid = {
        state: 'thinking',
        message: 'Analyzing data...',
      };
      expect(statusPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate with progress', () => {
      const valid = {
        state: 'executing',
        message: 'Running campaign',
        progress: {
          current: 5,
          total: 10,
          label: 'Steps completed',
        },
      };
      expect(statusPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject invalid state', () => {
      const invalid = { state: 'running' };
      expect(statusPayloadSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject negative progress', () => {
      const invalid = {
        state: 'executing',
        progress: { current: -1, total: 10 },
      };
      expect(statusPayloadSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('errorPayloadSchema', () => {
    it('should validate basic error', () => {
      const valid = {
        code: 'validation_error',
        message: 'Invalid input',
        retryable: false,
      };
      expect(errorPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate with details', () => {
      const valid = {
        code: 'rate_limited',
        message: 'Too many requests',
        details: { retryAfter: 60 },
        retryable: true,
      };
      expect(errorPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject invalid error code', () => {
      const invalid = {
        code: 'unknown_error',
        message: 'Error',
        retryable: false,
      };
      expect(errorPayloadSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('eventEnvelopeSchema', () => {
    it('should validate complete event envelope', () => {
      const valid = {
        kind: 'event',
        seq: 1,
        type: 'message',
        payload: { text: 'Hello', source: 'brain' },
        at: new Date().toISOString(),
      };
      expect(eventEnvelopeSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate with UI', () => {
      const valid = {
        kind: 'event',
        seq: 1,
        type: 'message',
        payload: { text: 'Hello', source: 'brain' },
        ui: {
          component: 'text',
          version: '1.0.0',
          props: { text: 'Hello' },
        },
        fallbackText: 'Hello',
        at: new Date().toISOString(),
      };
      expect(eventEnvelopeSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject negative seq', () => {
      const invalid = {
        kind: 'event',
        seq: -1,
        type: 'message',
        payload: { text: 'Hello', source: 'brain' },
        at: new Date().toISOString(),
      };
      expect(eventEnvelopeSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('validateEventPayload', () => {
    it('should validate correct payload for type', () => {
      expect(
        validateEventPayload('message', { text: 'Hello', source: 'brain' })
      ).toBe(true);
    });

    it('should reject incorrect payload for type', () => {
      expect(validateEventPayload('message', { text: '', source: 'brain' })).toBe(
        false
      );
    });

    it('should reject unknown event type', () => {
      expect(
        validateEventPayload('unknown', { text: 'Hello', source: 'brain' })
      ).toBe(false);
    });
  });
});
