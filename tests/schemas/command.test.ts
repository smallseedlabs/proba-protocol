/**
 * Tests for command schemas.
 */

import { describe, it, expect } from '@jest/globals';
import {
  commandEnvelopeSchema,
  sendMessagePayloadSchema,
  answerAskPayloadSchema,
  createGoalPayloadSchema,
  validateCommandPayload,
} from '../../src/schemas/command.js';

describe('Command Schemas', () => {
  describe('sendMessagePayloadSchema', () => {
    it('should validate valid send message payload', () => {
      const valid = {
        text: 'Hello, world!',
      };
      expect(sendMessagePayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate with attachments', () => {
      const valid = {
        text: 'Check this out',
        attachments: [
          {
            type: 'image',
            url: 'https://example.com/image.png',
            name: 'screenshot.png',
          },
        ],
      };
      expect(sendMessagePayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject empty text', () => {
      const invalid = { text: '' };
      expect(sendMessagePayloadSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject text exceeding max length', () => {
      const invalid = { text: 'x'.repeat(10001) };
      expect(sendMessagePayloadSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject invalid attachment URL', () => {
      const invalid = {
        text: 'Hello',
        attachments: [{ type: 'image', url: 'not-a-url' }],
      };
      expect(sendMessagePayloadSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('answerAskPayloadSchema', () => {
    it('should validate valid answer with approve', () => {
      const valid = {
        askId: '550e8400-e29b-41d4-a716-446655440000',
        choice: 'approve',
      };
      expect(answerAskPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate with values', () => {
      const valid = {
        askId: '550e8400-e29b-41d4-a716-446655440000',
        choice: 'edit',
        values: { budget: 100 },
        edit: 'Reduced budget to $100',
      };
      expect(answerAskPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalid = {
        askId: 'not-a-uuid',
        choice: 'approve',
      };
      expect(answerAskPayloadSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject invalid choice', () => {
      const invalid = {
        askId: '550e8400-e29b-41d4-a716-446655440000',
        choice: 'maybe',
      };
      expect(answerAskPayloadSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('createGoalPayloadSchema', () => {
    it('should validate minimal goal', () => {
      const valid = {
        title: 'Test Campaign',
      };
      expect(createGoalPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate full goal with budget', () => {
      const valid = {
        title: 'Test Campaign',
        description: 'A test ad campaign',
        constraints: ['family-friendly', 'no-gambling'],
        budget: {
          daily: 50,
          total: 500,
          currency: 'USD',
        },
      };
      expect(createGoalPayloadSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject empty title', () => {
      const invalid = { title: '' };
      expect(createGoalPayloadSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject invalid currency code', () => {
      const invalid = {
        title: 'Test',
        budget: { daily: 50, currency: 'US' },
      };
      expect(createGoalPayloadSchema.safeParse(invalid).success).toBe(false);
    });

    it('should reject negative budget', () => {
      const invalid = {
        title: 'Test',
        budget: { daily: -50, currency: 'USD' },
      };
      expect(createGoalPayloadSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('commandEnvelopeSchema', () => {
    it('should validate complete command envelope', () => {
      const valid = {
        kind: 'command',
        clientMsgId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'send_message',
        payload: { text: 'Hello' },
        sentAt: new Date().toISOString(),
      };
      expect(commandEnvelopeSchema.safeParse(valid).success).toBe(true);
    });

    it('should validate with threadId', () => {
      const valid = {
        kind: 'command',
        clientMsgId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'send_message',
        threadId: '660e8400-e29b-41d4-a716-446655440000',
        payload: { text: 'Hello' },
        sentAt: new Date().toISOString(),
      };
      expect(commandEnvelopeSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject wrong kind', () => {
      const invalid = {
        kind: 'event',
        clientMsgId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'send_message',
        payload: { text: 'Hello' },
        sentAt: new Date().toISOString(),
      };
      expect(commandEnvelopeSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('validateCommandPayload', () => {
    it('should validate correct payload for type', () => {
      expect(
        validateCommandPayload('send_message', { text: 'Hello' })
      ).toBe(true);
    });

    it('should reject incorrect payload for type', () => {
      expect(validateCommandPayload('send_message', { text: '' })).toBe(false);
    });

    it('should reject unknown command type', () => {
      expect(validateCommandPayload('unknown', { text: 'Hello' })).toBe(false);
    });
  });
});
