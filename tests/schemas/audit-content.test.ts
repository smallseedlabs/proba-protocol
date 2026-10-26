/**
 * Tests for the optional raw-text `content` of an audit event (added in 0.3.3).
 */

import { describe, it, expect } from '@jest/globals';
import {
  auditEventSchema,
  auditContentSchema,
  storedAuditEventSchema,
  validateAuditEvent,
} from '../../src/schemas/audit.js';
import { buildAuditEvent } from '../../src/builders/audit.js';
import { AUDIT_CONTENT_KINDS, AUDIT_CONTENT_MAX_CHARS } from '../../src/types/audit.js';
import { buildAuditContent, canonicalizeAuditContent, canonicalizeAuditEvent } from '../../src/utils/audit.js';

const draft = {
  traceId: '550e8400-e29b-41d4-a716-446655440000',
  workspaceId: 'default',
  actor: { type: 'user' as const, id: '660e8400-e29b-41d4-a716-446655440000' },
  service: 'hub',
  action: 'thread.message_received',
  category: 'data_access' as const,
  outcome: 'success' as const,
};

describe('AuditEvent.content', () => {
  it('should keep older events valid: content is optional', () => {
    expect(validateAuditEvent(buildAuditEvent(draft)).success).toBe(true);
  });

  it('should accept an event with content', () => {
    const event = buildAuditEvent({ ...draft, content: buildAuditContent('user_message', 'Launch the spring campaign', { redactions: 0 }) });
    expect(validateAuditEvent(event).success).toBe(true);
    expect(event.content).toEqual({ kind: 'user_message', text: 'Launch the spring campaign', truncated: false, originalLength: 26, redactions: 0 });
  });

  it('should recommend kinds and accept other snake_case kinds, not other shapes', () => {
    for (const kind of AUDIT_CONTENT_KINDS) expect(auditContentSchema.safeParse(buildAuditContent(kind, 'x')).success).toBe(true);
    expect(auditContentSchema.safeParse(buildAuditContent('plan_summary', 'x')).success).toBe(true);
    expect(auditContentSchema.safeParse(buildAuditContent('User Message', 'x')).success).toBe(false);
    expect(auditContentSchema.safeParse(buildAuditContent('', 'x')).success).toBe(false);
  });

  it('should truncate at the maximum and flag it', () => {
    const long = 'a'.repeat(AUDIT_CONTENT_MAX_CHARS + 500);
    const content = buildAuditContent('brain_reply', long, { redactions: 2 });
    expect(content.text).toHaveLength(AUDIT_CONTENT_MAX_CHARS);
    expect(content.truncated).toBe(true);
    expect(content.originalLength).toBe(AUDIT_CONTENT_MAX_CHARS + 500);
    expect(content.redactions).toBe(2);
    expect(auditContentSchema.safeParse(content).success).toBe(true);
  });

  it('should not truncate text of exactly the maximum', () => {
    const content = buildAuditContent('brain_reply', 'b'.repeat(AUDIT_CONTENT_MAX_CHARS));
    expect(content.truncated).toBe(false);
    expect(content.originalLength).toBe(AUDIT_CONTENT_MAX_CHARS);
  });

  it('should never cut a surrogate pair in half', () => {
    const text = 'a'.repeat(9) + '\u{1F600}' + 'tail';
    const content = buildAuditContent('explanation', text, { maxChars: 10 });
    expect(content.text).toBe('a'.repeat(9));
    expect(content.truncated).toBe(true);
    expect(content.originalLength).toBe(text.length);
    expect(auditContentSchema.safeParse(content).success).toBe(true);
  });

  it('should reject text above the maximum, even when flagged', () => {
    const text = 'a'.repeat(AUDIT_CONTENT_MAX_CHARS + 1);
    expect(auditContentSchema.safeParse({ kind: 'prompt', text, truncated: true, originalLength: text.length + 1, redactions: 0 }).success).toBe(false);
  });

  it('should keep truncated, originalLength and text consistent', () => {
    const ok = { kind: 'prompt', text: 'abc', truncated: false, originalLength: 3, redactions: 0 };
    expect(auditContentSchema.safeParse(ok).success).toBe(true);
    expect(auditContentSchema.safeParse({ ...ok, originalLength: 10 }).success).toBe(false);
    expect(auditContentSchema.safeParse({ ...ok, truncated: true }).success).toBe(false);
    expect(auditContentSchema.safeParse({ ...ok, truncated: true, originalLength: 10 }).success).toBe(true);
    expect(auditContentSchema.safeParse({ ...ok, redactions: -1 }).success).toBe(false);
    expect(auditContentSchema.safeParse({ ...ok, redactions: 1.5 }).success).toBe(false);
  });

  it('should include content in the canonical event and canonicalise it deterministically', () => {
    const content = buildAuditContent('user_message', 'hello');
    const a = buildAuditEvent({ ...draft, eventId: '770e8400-e29b-41d4-a716-446655440000', spanId: '1111111111111111', occurredAt: '2026-01-01T00:00:00.000Z', content });
    expect(canonicalizeAuditEvent(a)).toContain('"content":{"kind":"user_message","originalLength":5,"redactions":0,"text":"hello","truncated":false}');
    expect(canonicalizeAuditContent(content)).toBe('{"kind":"user_message","originalLength":5,"redactions":0,"text":"hello","truncated":false}');
    expect(canonicalizeAuditContent({ text: 'hello', truncated: false, redactions: 0, originalLength: 5, kind: 'user_message' })).toBe(canonicalizeAuditContent(content));
  });

  it('should accept a stored event with a contentDigest and reject a malformed one', () => {
    const base = {
      ...buildAuditEvent({ ...draft, content: buildAuditContent('user_message', 'hi') }),
      prevHash: null,
      hash: 'a'.repeat(64),
      ingestedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    };
    expect(storedAuditEventSchema.safeParse({ ...base, contentDigest: 'b'.repeat(64) }).success).toBe(true);
    expect(storedAuditEventSchema.safeParse(base).success).toBe(true);
    expect(storedAuditEventSchema.safeParse({ ...base, contentDigest: 'XYZ' }).success).toBe(false);
  });

  it('should still reject unknown top-level fields as before (strip, not fail) and keep content typed', () => {
    const parsed = auditEventSchema.parse({ ...buildAuditEvent(draft), content: buildAuditContent('prompt', 'p') });
    expect(parsed.content?.kind).toBe('prompt');
  });
});
