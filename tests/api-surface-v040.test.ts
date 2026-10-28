/**
 * Public API surface for 0.4.0 must stay additive: every 0.3.3 export name
 * remains, and the new context exports are present.
 */

import { describe, it, expect } from '@jest/globals';
import * as root from '../src/index.js';
import * as audit from '../src/audit/index.js';

/** Representative exports that existed in 0.3.3 and must remain. */
const V033_ROOT = [
  'commandEnvelopeSchema',
  'eventEnvelopeSchema',
  'auditEventSchema',
  'storedAuditEventSchema',
  'metricObservationSchema',
  'AUDIT_ACTIONS',
  'AUDIT_ACTION_INFO',
  'isKnownAuditAction',
  'getAuditActionInfo',
  'buildAuditEvent',
  'validateAuditEvent',
  'auditContentSchema',
] as const;

const V040_NEW = [
  'stepTypeSchema',
  'contextRequestSchema',
  'contextPacketSchema',
  'contextNeedSchema',
  'actAsAssertionClaimsSchema',
  'contextAuditDetailsSchema',
  'brainContextAttachedDetailsSchema',
  'KNOWN_GAP_CODES',
  'ACT_AS_ASSERTION_MAX_TTL_SECONDS',
  'validateContextRequest',
  'validateContextPacket',
  'validateActAsAssertionClaims',
] as const;

describe('public API surface 0.4.0 (additive)', () => {
  it('keeps every listed 0.3.3 root export', () => {
    for (const name of V033_ROOT) {
      expect(root).toHaveProperty(name);
      expect((root as Record<string, unknown>)[name]).toBeDefined();
    }
  });

  it('exports the new context bridge symbols from the root and /audit', () => {
    for (const name of V040_NEW) {
      expect(root).toHaveProperty(name);
      expect(audit).toHaveProperty(name);
    }
  });

  it('still parses a minimal 0.3.3-shaped audit event (no content)', () => {
    const event = root.buildAuditEvent({
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: 'seedbed',
      actor: { type: 'service', id: 'hub' },
      service: 'hub',
      action: 'command.received',
      category: 'command',
      outcome: 'success',
    });
    expect(root.validateAuditEvent(event).success).toBe(true);
    expect(event).not.toHaveProperty('content');
  });
});
