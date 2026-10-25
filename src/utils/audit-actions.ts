/**
 * Audit action catalog.
 *
 * Action names are dotted, lower-case and shaped `<domain>.<verb_or_event>`
 * (validation only requires the shape, see auditEventSchema). The catalog is a
 * recommendation, not an allow-list: services may add their own actions, and
 * every action ever published stays valid.
 *
 * Domain vs category. The first segment of an action is its *domain* (`goal`,
 * `budget`, `stream`, ...). The `category` field of an AuditEvent is a fixed,
 * coarser enum that consumers index on, so a domain does not have to equal a
 * category: `goal.created` is category `data_access`, `control.paused` is
 * category `config`. AUDIT_ACTION_INFO gives the recommended category and
 * default risk level per action.
 *
 * Specific vs generic. Some names published in v0.2.0 are generic
 * (`data_access.write`, `policy.evaluated`, `config.changed`, ...). They stay
 * valid, but producers should prefer the specific action named in `preferred`.
 * A few are plain aliases of a better name (status `alias`).
 */

import type { AuditCategory, AuditRiskLevel } from '../types/audit.js';

/** Recommended action names, grouped by domain (the first segment of the action). */
export const AUDIT_ACTIONS = {
  command: ['command.received', 'command.accepted', 'command.rejected', 'command.processed', 'command.duplicate'],
  thread: ['thread.created', 'thread.message_received', 'thread.access_denied'],
  goal: [
    'goal.created',
    'goal.updated',
    'goal.status_changed',
    'goal.clarification_answered',
    'goal.budget_proposed',
    'goal.budget_approved',
    'goal.budget_declined',
  ],
  budget: ['budget.evaluated', 'budget.limit_reached'],
  brain: [
    'brain.llm_call',
    'brain.reply_generated',
    'brain.explanation_generated',
    'brain.clarification_requested',
    'brain.clarify_requested',
    'brain.plan_created',
    'brain.decision_made',
    'brain.error',
  ],
  tool: ['tool.proposed', 'tool.executed', 'tool.failed', 'tool.called', 'tool.completed'],
  policy: ['policy.evaluated', 'policy.allowed', 'policy.denied'],
  approval: ['approval.requested', 'approval.granted', 'approval.rejected', 'approval.expired'],
  control: ['control.paused', 'control.resumed', 'control.emergency_stopped', 'control.killed'],
  stream: ['stream.connected', 'stream.disconnected'],
  auth: ['auth.sign_in', 'auth.sign_out', 'auth.session_issued', 'auth.session_revoked', 'auth.session_expired', 'auth.denied'],
  data_access: ['data_access.read', 'data_access.write', 'data_access.export', 'data_access.delete'],
  memory: [
    'memory.ingested',
    'memory.promoted',
    'memory.consolidated',
    'memory.decayed',
    'memory.retrieved',
    'memory.read',
    'memory.write',
    'memory.delete',
  ],
  metrics: [
    'metrics.fetch_started',
    'metrics.fetch_completed',
    'metrics.fetch_failed',
    'metrics.ingested',
    'metrics.restated',
    'metrics.rollup_run',
    'metrics.observation_stored',
  ],
  config: ['config.changed', 'config.loaded'],
  system: ['system.started', 'system.stopped', 'system.job_run', 'system.job_failed', 'system.error'],
} as const;

export type AuditActionDomain = keyof typeof AUDIT_ACTIONS;

/** Every action in the catalog. */
export type AuditActionName = (typeof AUDIT_ACTIONS)[AuditActionDomain][number];

/**
 * - `specific`: the preferred name for what happened.
 * - `generic`: valid and published, but too broad; use the `preferred` actions when one fits.
 * - `alias`: same meaning as `preferred[0]`, kept only for backwards compatibility.
 */
export type AuditActionStatus = 'specific' | 'generic' | 'alias';

export interface AuditActionInfo {
  /** Recommended `category` for events with this action. */
  category: AuditCategory;
  /** Recommended default `riskLevel`; a producer may raise or lower it for a given event. */
  riskLevel: AuditRiskLevel;
  status: AuditActionStatus;
  /** Specific action(s) to use instead of a `generic` or `alias` action. */
  preferred?: readonly AuditActionName[];
  /** One line on when to emit it (outcome and details guidance included). */
  description: string;
}

function info(
  category: AuditCategory,
  riskLevel: AuditRiskLevel,
  description: string,
  extra: { status?: AuditActionStatus; preferred?: readonly AuditActionName[] } = {}
): AuditActionInfo {
  return { category, riskLevel, status: extra.status ?? 'specific', ...(extra.preferred ? { preferred: extra.preferred } : {}), description };
}

/**
 * Recommended category and default risk level per action, plus the
 * old-to-new mapping for generic and alias actions. Typed as a Record over
 * AuditActionName, so adding an action to AUDIT_ACTIONS without describing it
 * here does not compile.
 */
export const AUDIT_ACTION_INFO: Record<AuditActionName, AuditActionInfo> = {
  // command
  'command.received': info('command', 'low', 'A command arrived at the service (root event of a command trace).'),
  'command.accepted': info('command', 'low', 'The command passed validation and was queued for processing.'),
  'command.rejected': info('command', 'low', 'The command was refused: invalid envelope or payload (failure), or not allowed (denied).'),
  'command.processed': info('command', 'low', 'Processing of the command finished (outcome success or failure).'),
  'command.duplicate': info('command', 'low', 'A command with an already seen clientMsgId was replayed and ignored.'),

  // thread
  'thread.created': info('command', 'low', 'A conversation thread was created.'),
  'thread.message_received': info('command', 'low', 'A user message was added to a thread (details: message id and length, never the text).'),
  'thread.access_denied': info('policy', 'medium', 'A user tried to use a thread they do not own.'),

  // goal
  'goal.created': info('data_access', 'low', 'A goal was created.'),
  'goal.updated': info('data_access', 'low', 'Goal fields changed (details: names of the changed fields, not values).'),
  'goal.status_changed': info('data_access', 'low', 'Goal lifecycle status changed (details: from, to).'),
  'goal.clarification_answered': info('data_access', 'low', 'The user answered a clarification question for the goal.'),
  'goal.budget_proposed': info('policy', 'medium', 'A budget (amount, currency, period) was proposed for the goal, by the brain or the user.'),
  'goal.budget_approved': info('approval', 'medium', 'The user approved the goal budget.'),
  'goal.budget_declined': info('approval', 'low', 'The user declined the goal budget.'),

  // budget
  'budget.evaluated': info('policy', 'medium', 'A cost or spend was checked against a budget (details: limit, spent, enforced; outcome success or denied).'),
  'budget.limit_reached': info('policy', 'high', 'A budget limit was reached or exceeded.'),

  // brain
  'brain.llm_call': info('brain', 'low', 'The brain / an LLM was invoked (model, token cost, output kinds; no prompt or reply text).'),
  'brain.reply_generated': info('brain', 'low', 'The brain produced a reply to the user (details: length, never the text).'),
  'brain.explanation_generated': info('brain', 'low', 'The brain produced an explanation (details: length, never the text).'),
  'brain.clarification_requested': info('brain', 'low', 'The brain asked the user a clarifying question.'),
  'brain.clarify_requested': info('brain', 'low', 'Alias of brain.clarification_requested.', { status: 'alias', preferred: ['brain.clarification_requested'] }),
  'brain.plan_created': info('brain', 'low', 'The brain produced a plan.'),
  'brain.decision_made': info('brain', 'medium', 'The brain made a decision that moves the goal forward.'),
  'brain.error': info('brain', 'medium', 'The brain failed or returned unusable output (outcome failure).'),

  // tool
  'tool.proposed': info('tool', 'low', 'A tool call was proposed and has not run (usually waiting for approval; outcome partial). Details: tool name, parameter names.'),
  'tool.executed': info('tool', 'medium', 'A tool call ran successfully (details: tool name, parameter names, result size).'),
  'tool.failed': info('tool', 'medium', 'A tool call failed (outcome failure; errorCode set).'),
  'tool.called': info('tool', 'low', 'Generic: a tool was called. Use tool.proposed or tool.executed.', { status: 'generic', preferred: ['tool.proposed', 'tool.executed'] }),
  'tool.completed': info('tool', 'medium', 'Alias of tool.executed.', { status: 'alias', preferred: ['tool.executed'] }),

  // policy
  'policy.evaluated': info('policy', 'low', 'Generic: a policy was evaluated. Use budget.evaluated for budgets.', { status: 'generic', preferred: ['budget.evaluated'] }),
  'policy.allowed': info('policy', 'low', 'A policy check allowed the action.'),
  'policy.denied': info('policy', 'medium', 'A policy check denied the action (outcome denied). Use thread.access_denied for thread ownership.', { status: 'generic', preferred: ['thread.access_denied'] }),

  // approval
  'approval.requested': info('approval', 'low', 'Human approval was requested (plan, tool call, budget).'),
  'approval.granted': info('approval', 'medium', 'Approval was granted.'),
  'approval.rejected': info('approval', 'low', 'Approval was rejected.'),
  'approval.expired': info('approval', 'low', 'An approval request expired without an answer.'),

  // control
  'control.paused': info('config', 'medium', 'Execution was paused (details.scope: workspace, goal, ...).'),
  'control.resumed': info('config', 'medium', 'Execution was resumed after a pause.'),
  'control.emergency_stopped': info('config', 'high', 'Emergency stop: everything in the scope (usually the workspace) was halted at once.'),
  'control.killed': info('config', 'high', 'A single goal, run or agent was terminated and cannot be resumed.'),

  // stream
  'stream.connected': info('data_access', 'low', 'A client opened a live event stream (SSE). Details: transport, resume position; no address.'),
  'stream.disconnected': info('data_access', 'low', 'A live event stream closed (details: duration, reason).'),

  // auth
  'auth.sign_in': info('auth', 'low', 'A user signed in (root event of the sign-in request).'),
  'auth.sign_out': info('auth', 'low', 'A user signed out.'),
  'auth.session_issued': info('auth', 'low', 'A session was issued.'),
  'auth.session_revoked': info('auth', 'low', 'A session was revoked.'),
  'auth.session_expired': info('auth', 'low', 'A session expired or was rejected as expired.'),
  'auth.denied': info('auth', 'medium', 'Authentication or authorisation was refused (outcome failure or denied).'),

  // data_access
  'data_access.read': info('data_access', 'low', 'Generic: data was read. Use stream.connected for SSE, memory.retrieved for memory.', { status: 'generic', preferred: ['stream.connected', 'stream.disconnected', 'memory.retrieved'] }),
  'data_access.write': info('data_access', 'low', 'Generic: data was written. Use the goal.* actions for goals.', { status: 'generic', preferred: ['goal.created', 'goal.updated', 'goal.status_changed', 'goal.clarification_answered'] }),
  'data_access.export': info('data_access', 'high', 'Data left the system (export or download).'),
  'data_access.delete': info('data_access', 'medium', 'Data was deleted.'),

  // memory
  'memory.ingested': info('memory', 'low', 'A memory item was ingested and stored.'),
  'memory.promoted': info('memory', 'low', 'A memory item was promoted to a longer-lived tier.'),
  'memory.consolidated': info('memory', 'low', 'Memory items were consolidated or merged.'),
  'memory.decayed': info('memory', 'low', 'Memory items lost weight or were expired by the decay job.'),
  'memory.retrieved': info('memory', 'low', 'Memory items were retrieved for a brain call (details: count, ids).'),
  'memory.read': info('memory', 'low', 'Generic: memory was read. Use memory.retrieved.', { status: 'generic', preferred: ['memory.retrieved'] }),
  'memory.write': info('memory', 'low', 'Generic: memory was written. Use memory.ingested.', { status: 'generic', preferred: ['memory.ingested'] }),
  'memory.delete': info('memory', 'medium', 'A memory item was deleted.'),

  // metrics
  'metrics.fetch_started': info('metrics', 'low', 'Fetching metrics from an ad platform started.'),
  'metrics.fetch_completed': info('metrics', 'low', 'Fetching metrics from an ad platform finished.'),
  'metrics.fetch_failed': info('metrics', 'medium', 'Fetching metrics from an ad platform failed (outcome failure).'),
  'metrics.ingested': info('metrics', 'low', 'A MetricObservation was ingested and stored (revision 0).'),
  'metrics.restated': info('metrics', 'low', 'A stored period was restated by the platform (revision > 0).'),
  'metrics.rollup_run': info('metrics', 'low', 'A metrics rollup job ran (details: period, rows).'),
  'metrics.observation_stored': info('metrics', 'low', 'Alias of metrics.ingested.', { status: 'alias', preferred: ['metrics.ingested'] }),

  // config
  'config.changed': info('config', 'medium', 'Generic: configuration or state was changed. Use control.* for pause, resume and stops.', { status: 'generic', preferred: ['control.paused', 'control.resumed', 'control.emergency_stopped', 'control.killed'] }),
  'config.loaded': info('config', 'low', 'Configuration was loaded.'),

  // system
  'system.started': info('system', 'low', 'A service started.'),
  'system.stopped': info('system', 'low', 'A service stopped.'),
  'system.job_run': info('system', 'low', 'A background job ran (own traceId per run).'),
  'system.job_failed': info('system', 'medium', 'A background job failed (outcome failure).'),
  'system.error': info('system', 'medium', 'An unexpected error (outcome failure; errorCode, errorMessage).'),
};

const KNOWN_ACTIONS: ReadonlySet<string> = new Set(Object.values(AUDIT_ACTIONS).flat());

/** True when `action` is in the catalog. Unknown actions still validate; this only says whether the catalog describes it. */
export function isKnownAuditAction(action: string): action is AuditActionName {
  return KNOWN_ACTIONS.has(action);
}

/** Catalog entry for `action`, or undefined when it is not in the catalog. */
export function getAuditActionInfo(action: string): AuditActionInfo | undefined {
  return isKnownAuditAction(action) ? AUDIT_ACTION_INFO[action] : undefined;
}
