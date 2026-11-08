/**
 * Generated JSON Schema bundle (Zod 4 z.toJSONSchema) must keep the same
 * wire field names consumers already validate. Shape of nested $ref wrappers
 * from zod-to-json-schema may differ; required properties must not.
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildAuditEvent, validateAuditEvent } from '../../src/index.js';

const bundle = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../schemas/index.json'), 'utf8')
) as {
  version: string;
  $schema: string;
  definitions: Record<string, { required?: string[]; properties?: Record<string, unknown>; additionalProperties?: unknown }>;
};

const AUDIT_REQUIRED = [
  'version',
  'eventId',
  'traceId',
  'spanId',
  'workspaceId',
  'actor',
  'service',
  'action',
  'category',
  'outcome',
  'occurredAt',
  'details',
] as const;

describe('JSON Schema bundle 0.6.0 (Zod 4 generator)', () => {
  it('is draft-07 with the 0.6.0 definition set', () => {
    expect(bundle.version).toBe('0.6.0');
    expect(bundle.$schema).toBe('http://json-schema.org/draft-07/schema#');
    for (const name of [
      'CommandEnvelope',
      'EventEnvelope',
      'AuditEvent',
      'StoredAuditEvent',
      'MetricObservation',
      'ContextPacket',
      'UserSuppliedInput',
      'ResearchReviewAsk',
    ]) {
      expect(bundle.definitions[name]).toBeDefined();
    }
  });

  it('keeps AuditEvent required wire fields', () => {
    const audit = bundle.definitions.AuditEvent;
    expect(audit.required).toEqual(expect.arrayContaining([...AUDIT_REQUIRED]));
    for (const field of AUDIT_REQUIRED) {
      expect(audit.properties).toHaveProperty(field);
    }
    expect(audit.properties).toHaveProperty('content');
  });

  it('still validates a built AuditEvent (validate/build API unchanged)', () => {
    const event = buildAuditEvent({
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: 'seedbed',
      actor: { type: 'service', id: 'hub' },
      service: 'hub',
      action: 'command.received',
      category: 'command',
      outcome: 'success',
    });
    const result = validateAuditEvent(event);
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('data');
  });
});
