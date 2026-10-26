/**
 * Tests for the audit action catalog.
 */

import { describe, it, expect } from '@jest/globals';
import { validateAuditEvent, auditCategorySchema } from '../../src/schemas/audit.js';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_INFO,
  getAuditActionInfo,
  isKnownAuditAction,
  type AuditActionName,
} from '../../src/utils/audit-actions.js';
import { buildAuditEvent } from '../../src/builders/audit.js';

/** Every action listed in AUDIT_ACTIONS in v0.2.0. All of them must stay valid and listed. */
const V020_ACTIONS = [
  'command.received', 'command.accepted', 'command.rejected', 'command.processed', 'command.duplicate',
  'brain.llm_call', 'brain.plan_created', 'brain.clarify_requested', 'brain.decision_made', 'brain.error',
  'tool.called', 'tool.completed', 'tool.failed',
  'policy.evaluated', 'policy.allowed', 'policy.denied',
  'approval.requested', 'approval.granted', 'approval.rejected', 'approval.expired',
  'data_access.read', 'data_access.write', 'data_access.export',
  'memory.read', 'memory.write', 'memory.delete',
  'metrics.fetch_started', 'metrics.fetch_completed', 'metrics.fetch_failed', 'metrics.observation_stored',
  'auth.sign_in', 'auth.sign_out', 'auth.session_issued', 'auth.session_revoked', 'auth.denied',
  'config.changed', 'config.loaded',
  'system.started', 'system.stopped', 'system.job_run', 'system.error',
];

/** The names the Hub asked for (specific replacements for generic ones). */
const REQUESTED_ACTIONS = [
  'goal.created', 'goal.updated', 'goal.status_changed', 'goal.budget_proposed', 'goal.budget_approved', 'goal.budget_declined',
  'budget.evaluated', 'budget.limit_reached',
  'thread.created', 'thread.message_received',
  'brain.reply_generated', 'brain.clarification_requested', 'brain.plan_created', 'brain.decision_made', 'brain.llm_call', 'brain.error',
  'tool.proposed', 'tool.executed', 'tool.failed',
  'approval.requested', 'approval.granted', 'approval.rejected', 'approval.expired',
  'control.paused', 'control.resumed', 'control.emergency_stopped', 'control.killed',
  'stream.connected', 'stream.disconnected',
  'memory.ingested', 'memory.promoted', 'memory.consolidated', 'memory.decayed', 'memory.retrieved',
  'metrics.ingested', 'metrics.restated', 'metrics.rollup_run',
  'config.changed',
];

/** Added in 0.3.1. */
const CAMPAIGN_ACTIONS = [
  'campaign.created', 'campaign.launched', 'campaign.paused', 'campaign.resumed', 'campaign.stopped',
  'campaign.budget_changed', 'campaign.synced', 'campaign.sync_failed', 'campaign.metrics_attributed',
];

const ALL = Object.values(AUDIT_ACTIONS).flat() as AuditActionName[];
const SHAPE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

describe('AUDIT_ACTIONS catalog', () => {
  it('should be grouped by domain, each action prefixed by its domain', () => {
    for (const [domain, actions] of Object.entries(AUDIT_ACTIONS)) {
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) expect(action.startsWith(`${domain}.`)).toBe(true);
    }
  });

  it('should keep a domain for every category (so AUDIT_ACTIONS[category] keeps working)', () => {
    for (const category of auditCategorySchema.options) {
      expect(AUDIT_ACTIONS).toHaveProperty(category);
    }
  });

  it('should have no duplicates and only dotted lower-case names', () => {
    expect(new Set(ALL).size).toBe(ALL.length);
    for (const action of ALL) expect(action).toMatch(SHAPE);
  });

  it('should be additive: every action published in v0.2.0 is still listed', () => {
    for (const action of V020_ACTIONS) expect(ALL).toContain(action);
  });

  it('should contain every action requested for the catalog', () => {
    for (const action of REQUESTED_ACTIONS) expect(ALL).toContain(action);
  });

  it('should contain the campaign actions, none of them generic or alias', () => {
    expect([...AUDIT_ACTIONS.campaign]).toEqual(CAMPAIGN_ACTIONS);
    for (const action of CAMPAIGN_ACTIONS) expect(AUDIT_ACTION_INFO[action as AuditActionName].status).toBe('specific');
  });

  it('should map campaign actions to existing categories: lifecycle to command, budget to policy, sync to metrics', () => {
    const category = (a: string) => AUDIT_ACTION_INFO[a as AuditActionName].category;
    for (const a of ['campaign.created', 'campaign.launched', 'campaign.paused', 'campaign.resumed', 'campaign.stopped']) expect(category(a)).toBe('command');
    expect(category('campaign.budget_changed')).toBe('policy');
    for (const a of ['campaign.synced', 'campaign.sync_failed', 'campaign.metrics_attributed']) expect(category(a)).toBe('metrics');
  });

  it('should rate launching and budget changes high risk', () => {
    expect(AUDIT_ACTION_INFO['campaign.launched'].riskLevel).toBe('high');
    expect(AUDIT_ACTION_INFO['campaign.budget_changed'].riskLevel).toBe('high');
  });

  it('should validate every action (with its recommended category) as an AuditEvent', () => {
    for (const action of ALL) {
      const event = buildAuditEvent({
        traceId: '550e8400-e29b-41d4-a716-446655440000',
        workspaceId: 'seedbed',
        actor: { type: 'service', id: 'hub' },
        service: 'hub',
        action,
        category: AUDIT_ACTION_INFO[action].category,
        outcome: 'success',
        riskLevel: AUDIT_ACTION_INFO[action].riskLevel,
      });
      expect(validateAuditEvent(event).success).toBe(true);
    }
  });

  it('should still accept actions that are not in the catalog', () => {
    expect(isKnownAuditAction('command.something_new')).toBe(false);
    expect(getAuditActionInfo('command.something_new')).toBeUndefined();
  });
});

describe('AUDIT_ACTION_INFO', () => {
  it('should describe exactly the listed actions', () => {
    expect(Object.keys(AUDIT_ACTION_INFO).sort()).toEqual([...ALL].sort());
  });

  it('should map every action to a valid category and risk level', () => {
    for (const action of ALL) {
      const entry = AUDIT_ACTION_INFO[action];
      expect(auditCategorySchema.safeParse(entry.category).success).toBe(true);
      expect(['low', 'medium', 'high']).toContain(entry.riskLevel);
      expect(entry.description.length).toBeGreaterThan(10);
    }
  });

  it('should keep the category of every v0.2.0 action equal to its prefix (the old contract)', () => {
    for (const action of V020_ACTIONS) {
      expect(AUDIT_ACTION_INFO[action as AuditActionName].category).toBe(action.split('.')[0]);
    }
  });

  it('should point generic and alias actions at known, specific actions', () => {
    for (const action of ALL) {
      const entry = AUDIT_ACTION_INFO[action];
      if (entry.status === 'specific') {
        expect(entry.preferred).toBeUndefined();
        continue;
      }
      expect(entry.preferred?.length).toBeGreaterThan(0);
      for (const preferred of entry.preferred ?? []) {
        expect(isKnownAuditAction(preferred)).toBe(true);
        expect(AUDIT_ACTION_INFO[preferred].status).toBe('specific');
      }
      if (entry.status === 'alias') expect(entry.preferred).toHaveLength(1);
    }
  });

  it('should map the Hub generic names to their specific replacements', () => {
    expect(AUDIT_ACTION_INFO['data_access.write'].preferred).toContain('goal.created');
    expect(AUDIT_ACTION_INFO['data_access.read'].preferred).toContain('stream.connected');
    expect(AUDIT_ACTION_INFO['policy.evaluated'].preferred).toContain('budget.evaluated');
    expect(AUDIT_ACTION_INFO['config.changed'].preferred).toContain('control.emergency_stopped');
    expect(AUDIT_ACTION_INFO['tool.called'].preferred).toContain('tool.proposed');
    expect(AUDIT_ACTION_INFO['brain.clarify_requested'].preferred).toEqual(['brain.clarification_requested']);
  });

  it('should rate emergency stops, kills and budget limits high risk', () => {
    for (const action of ['control.emergency_stopped', 'control.killed', 'budget.limit_reached', 'data_access.export', 'campaign.launched', 'campaign.budget_changed'] as const) {
      expect(AUDIT_ACTION_INFO[action].riskLevel).toBe('high');
    }
  });

  it('should look entries up with the helpers', () => {
    expect(isKnownAuditAction('goal.created')).toBe(true);
    expect(getAuditActionInfo('goal.created')?.category).toBe('data_access');
  });
});
