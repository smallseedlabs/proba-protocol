/**
 * Tests for idempotency utilities.
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateIdempotencyKey,
  generateTimestampedKey,
} from '../../src/utils/idempotency.js';

describe('Idempotency Utils', () => {
  describe('generateIdempotencyKey', () => {
    it('should generate a valid UUID', () => {
      const key = generateIdempotencyKey();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('generateTimestampedKey', () => {
    it('should generate a key with timestamp', () => {
      const key = generateTimestampedKey();
      expect(key).toContain('-');
      const parts = key.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(6);
      expect(Number.isNaN(Number(parts[0]))).toBe(false);
    });

    it('should include prefix when provided', () => {
      const key = generateTimestampedKey('test');
      expect(key.startsWith('test-')).toBe(true);
    });

    it('should generate unique timestamped keys', () => {
      const key1 = generateTimestampedKey();
      const key2 = generateTimestampedKey();
      expect(key1).not.toBe(key2);
    });
  });
});
