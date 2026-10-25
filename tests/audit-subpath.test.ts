/**
 * Tests that the root index and the audit subpath entry point expose the same contract.
 */

import { describe, it, expect } from '@jest/globals';
import * as root from '../src/index.js';
import * as audit from '../src/audit/index.js';

describe('audit exports', () => {
  it('should expose the contract from the audit entry point', () => {
    for (const name of [
      'auditEventSchema',
      'storedAuditEventSchema',
      'metricObservationSchema',
      'buildAuditEvent',
      'validateAuditEvent',
      'validateMetricObservation',
      'isAuditEvent',
      'canonicalizeAuditEvent',
      'AUDIT_ACTIONS',
      'AUDIT_ACTION_INFO',
      'isKnownAuditAction',
      'getAuditActionInfo',
    ]) {
      expect((audit as Record<string, unknown>)[name]).toBeDefined();
    }
  });

  it('should expose the same objects from the package root', () => {
    expect(root.auditEventSchema).toBe(audit.auditEventSchema);
    expect(root.buildAuditEvent).toBe(audit.buildAuditEvent);
    expect(root.metricObservationSchema).toBe(audit.metricObservationSchema);
  });
});
