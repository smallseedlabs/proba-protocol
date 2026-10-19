/**
 * Tests for type guard utilities.
 */

import { describe, it, expect } from '@jest/globals';
import {
  isCommandEnvelope,
  isEventEnvelope,
  isCommandType,
  isEventType,
  isBrainOutput,
} from '../../src/utils/guards.js';

describe('Type Guards', () => {
  describe('isCommandEnvelope', () => {
    it('should return true for valid command envelope', () => {
      const cmd = {
        kind: 'command',
        clientMsgId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'send_message',
        payload: { text: 'Hello' },
        sentAt: new Date().toISOString(),
      };
      expect(isCommandEnvelope(cmd)).toBe(true);
    });

    it('should return false for invalid envelope', () => {
      expect(isCommandEnvelope({ kind: 'event' })).toBe(false);
      expect(isCommandEnvelope(null)).toBe(false);
      expect(isCommandEnvelope('string')).toBe(false);
    });
  });

  describe('isEventEnvelope', () => {
    it('should return true for valid event envelope', () => {
      const evt = {
        kind: 'event',
        seq: 1,
        type: 'message',
        payload: { text: 'Hello', source: 'brain' },
        at: new Date().toISOString(),
      };
      expect(isEventEnvelope(evt)).toBe(true);
    });

    it('should return false for invalid envelope', () => {
      expect(isEventEnvelope({ kind: 'command' })).toBe(false);
      expect(isEventEnvelope(null)).toBe(false);
    });
  });

  describe('isCommandType', () => {
    it('should return true for valid command types', () => {
      expect(isCommandType('send_message')).toBe(true);
      expect(isCommandType('answer_ask')).toBe(true);
      expect(isCommandType('create_goal')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isCommandType('invalid')).toBe(false);
      expect(isCommandType(123)).toBe(false);
    });
  });

  describe('isEventType', () => {
    it('should return true for valid event types', () => {
      expect(isEventType('message')).toBe(true);
      expect(isEventType('ask')).toBe(true);
      expect(isEventType('error')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isEventType('invalid')).toBe(false);
      expect(isEventType(null)).toBe(false);
    });
  });

  describe('isBrainOutput', () => {
    it('should return true for valid brain outputs', () => {
      expect(isBrainOutput({ type: 'reply', text: 'Hello' })).toBe(true);
      expect(isBrainOutput({ type: 'clarify', reason: 'Need info' })).toBe(true);
    });

    it('should return false for invalid outputs', () => {
      expect(isBrainOutput({ type: 'invalid' })).toBe(false);
      expect(isBrainOutput({})).toBe(false);
    });
  });
});
