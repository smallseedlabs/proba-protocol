/**
 * Tests for command builders.
 */

import { describe, it, expect } from '@jest/globals';
import {
  buildSendMessageCommand,
  buildAnswerAskCommand,
  buildCreateGoalCommand,
} from '../../src/builders/command.js';
import { commandEnvelopeSchema } from '../../src/schemas/command.js';

describe('Command Builders', () => {
  describe('buildSendMessageCommand', () => {
    it('should build valid command with auto-generated clientMsgId', () => {
      const command = buildSendMessageCommand({
        text: 'Hello, world!',
      });

      expect(command.kind).toBe('command');
      expect(command.type).toBe('send_message');
      expect(command.clientMsgId).toBeDefined();
      expect(command.payload.text).toBe('Hello, world!');
      expect(command.sentAt).toBeDefined();
      expect(commandEnvelopeSchema.safeParse(command).success).toBe(true);
    });

    it('should accept custom clientMsgId', () => {
      const customId = '550e8400-e29b-41d4-a716-446655440000';
      const command = buildSendMessageCommand(
        { text: 'Hello' },
        { clientMsgId: customId }
      );

      expect(command.clientMsgId).toBe(customId);
    });

    it('should accept threadId', () => {
      const threadId = '660e8400-e29b-41d4-a716-446655440000';
      const command = buildSendMessageCommand(
        { text: 'Hello' },
        { threadId }
      );

      expect(command.threadId).toBe(threadId);
    });
  });

  describe('buildAnswerAskCommand', () => {
    it('should build valid answer command', () => {
      const command = buildAnswerAskCommand({
        askId: '550e8400-e29b-41d4-a716-446655440000',
        choice: 'approve',
      });

      expect(command.kind).toBe('command');
      expect(command.type).toBe('answer_ask');
      expect(command.payload.askId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(command.payload.choice).toBe('approve');
      expect(commandEnvelopeSchema.safeParse(command).success).toBe(true);
    });

    it('should include values and edit', () => {
      const command = buildAnswerAskCommand({
        askId: '550e8400-e29b-41d4-a716-446655440000',
        choice: 'edit',
        values: { budget: 100 },
        edit: 'Changed budget',
      });

      expect(command.payload.values).toEqual({ budget: 100 });
      expect(command.payload.edit).toBe('Changed budget');
    });
  });

  describe('buildCreateGoalCommand', () => {
    it('should build minimal goal command', () => {
      const command = buildCreateGoalCommand({
        title: 'Test Campaign',
      });

      expect(command.kind).toBe('command');
      expect(command.type).toBe('create_goal');
      expect(command.payload.title).toBe('Test Campaign');
      expect(commandEnvelopeSchema.safeParse(command).success).toBe(true);
    });

    it('should build full goal with budget', () => {
      const command = buildCreateGoalCommand({
        title: 'Test Campaign',
        description: 'A test campaign',
        budget: {
          daily: 50,
          currency: 'USD',
        },
      });

      expect(command.payload.budget).toEqual({
        daily: 50,
        currency: 'USD',
      });
    });
  });
});
