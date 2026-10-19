/**
 * Event envelope and payload types.
 * Events are sent from server to client.
 */

import type { ServerUI } from './ui.js';

export type EventType =
  | 'message'
  | 'ask'
  | 'ask_resolved'
  | 'status'
  | 'alert'
  | 'goal_updated'
  | 'ack'
  | 'error';

export interface EventEnvelope<T = unknown> {
  kind: 'event';
  seq: number;
  type: EventType;
  threadId?: string;
  payload: T;
  ui?: ServerUI;
  fallbackText?: string;
  at: string;
}

export interface MessagePayload {
  text: string;
  source: 'brain' | 'system' | 'user';
  replyTo?: string;
}

export type AskType = 'clarify' | 'action_approval' | 'plan_approval';
export type RiskLevel = 'low' | 'medium' | 'high';
export type OnExpire = 'deny' | 'default' | 'escalate';
export type QuestionType = 'choice' | 'number' | 'text' | 'confirm';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: QuestionOption[];
  constraints?: {
    min?: number;
    max?: number;
    step?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface AskPayload {
  askId: string;
  askType: AskType;
  title: string;
  description?: string;
  blocking: boolean;
  costEffect?: {
    current: number;
    proposed: number;
    currency: string;
    impact: string;
  };
  risk: RiskLevel;
  expiresAt?: string;
  onExpire?: OnExpire;
  questions: Question[];
}

export interface AskResolvedPayload {
  askId: string;
  resolution: 'answered' | 'expired' | 'superseded';
  answer?: {
    choice: 'approve' | 'reject' | 'edit';
    values?: Record<string, unknown>;
  };
}

export type StatusState = 'idle' | 'thinking' | 'executing' | 'waiting' | 'error';

export interface StatusPayload {
  state: StatusState;
  message?: string;
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

export interface AlertPayload {
  severity: AlertSeverity;
  title: string;
  message: string;
  actionable?: boolean;
  dismissible?: boolean;
}

export interface GoalUpdatedPayload {
  goalId: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  progress?: {
    completed: number;
    total: number;
    milestones?: Array<{
      name: string;
      completed: boolean;
    }>;
  };
  metrics?: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  };
}

export interface AckPayload {
  clientMsgId: string;
  processed: boolean;
}

export type ErrorCode =
  | 'ask_expired'
  | 'forbidden'
  | 'policy_denied'
  | 'validation_error'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'internal';

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}
