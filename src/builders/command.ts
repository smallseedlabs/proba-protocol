/**
 * Builder functions for creating command envelopes.
 */

import type {
  CommandEnvelope,
  SendMessagePayload,
  AnswerAskPayload,
  CreateGoalPayload,
  ApprovePlanPayload,
  ControlPayload,
  ExplainPayload,
  MarkReadPayload,
} from '../types/command.js';
import { generateIdempotencyKey } from '../utils/idempotency.js';

export interface BuilderOptions {
  clientMsgId?: string;
  threadId?: string;
}

export function buildSendMessageCommand(
  payload: SendMessagePayload,
  options: BuilderOptions = {}
): CommandEnvelope<SendMessagePayload> {
  return {
    kind: 'command',
    clientMsgId: options.clientMsgId ?? generateIdempotencyKey(),
    type: 'send_message',
    threadId: options.threadId,
    payload,
    sentAt: new Date().toISOString(),
  };
}

export function buildAnswerAskCommand(
  payload: AnswerAskPayload,
  options: BuilderOptions = {}
): CommandEnvelope<AnswerAskPayload> {
  return {
    kind: 'command',
    clientMsgId: options.clientMsgId ?? generateIdempotencyKey(),
    type: 'answer_ask',
    threadId: options.threadId,
    payload,
    sentAt: new Date().toISOString(),
  };
}

export function buildCreateGoalCommand(
  payload: CreateGoalPayload,
  options: BuilderOptions = {}
): CommandEnvelope<CreateGoalPayload> {
  return {
    kind: 'command',
    clientMsgId: options.clientMsgId ?? generateIdempotencyKey(),
    type: 'create_goal',
    threadId: options.threadId,
    payload,
    sentAt: new Date().toISOString(),
  };
}

export function buildApprovePlanCommand(
  payload: ApprovePlanPayload,
  options: BuilderOptions = {}
): CommandEnvelope<ApprovePlanPayload> {
  return {
    kind: 'command',
    clientMsgId: options.clientMsgId ?? generateIdempotencyKey(),
    type: 'approve_plan',
    threadId: options.threadId,
    payload,
    sentAt: new Date().toISOString(),
  };
}

export function buildControlCommand(
  payload: ControlPayload,
  options: BuilderOptions = {}
): CommandEnvelope<ControlPayload> {
  return {
    kind: 'command',
    clientMsgId: options.clientMsgId ?? generateIdempotencyKey(),
    type: 'control',
    threadId: options.threadId,
    payload,
    sentAt: new Date().toISOString(),
  };
}

export function buildExplainCommand(
  payload: ExplainPayload,
  options: BuilderOptions = {}
): CommandEnvelope<ExplainPayload> {
  return {
    kind: 'command',
    clientMsgId: options.clientMsgId ?? generateIdempotencyKey(),
    type: 'explain',
    threadId: options.threadId,
    payload,
    sentAt: new Date().toISOString(),
  };
}

export function buildMarkReadCommand(
  payload: MarkReadPayload,
  options: BuilderOptions = {}
): CommandEnvelope<MarkReadPayload> {
  return {
    kind: 'command',
    clientMsgId: options.clientMsgId ?? generateIdempotencyKey(),
    type: 'mark_read',
    threadId: options.threadId,
    payload,
    sentAt: new Date().toISOString(),
  };
}
