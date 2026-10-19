/**
 * Builder functions for creating event envelopes.
 */

import type {
  EventEnvelope,
  MessagePayload,
  AskPayload,
  AskResolvedPayload,
  StatusPayload,
  AlertPayload,
  GoalUpdatedPayload,
  AckPayload,
  ErrorPayload,
} from '../types/event.js';
import type { ServerUI } from '../types/ui.js';

export interface EventBuilderOptions {
  seq: number;
  threadId?: string;
  ui?: ServerUI;
  fallbackText?: string;
}

export function buildMessageEvent(
  payload: MessagePayload,
  options: EventBuilderOptions
): EventEnvelope<MessagePayload> {
  return {
    kind: 'event',
    seq: options.seq,
    type: 'message',
    threadId: options.threadId,
    payload,
    ui: options.ui,
    fallbackText: options.fallbackText ?? payload.text,
    at: new Date().toISOString(),
  };
}

export function buildAskEvent(
  payload: AskPayload,
  options: EventBuilderOptions
): EventEnvelope<AskPayload> {
  return {
    kind: 'event',
    seq: options.seq,
    type: 'ask',
    threadId: options.threadId,
    payload,
    ui: options.ui,
    fallbackText: options.fallbackText ?? payload.title,
    at: new Date().toISOString(),
  };
}

export function buildAskResolvedEvent(
  payload: AskResolvedPayload,
  options: EventBuilderOptions
): EventEnvelope<AskResolvedPayload> {
  return {
    kind: 'event',
    seq: options.seq,
    type: 'ask_resolved',
    threadId: options.threadId,
    payload,
    ui: options.ui,
    fallbackText: options.fallbackText,
    at: new Date().toISOString(),
  };
}

export function buildStatusEvent(
  payload: StatusPayload,
  options: EventBuilderOptions
): EventEnvelope<StatusPayload> {
  return {
    kind: 'event',
    seq: options.seq,
    type: 'status',
    threadId: options.threadId,
    payload,
    ui: options.ui,
    fallbackText: options.fallbackText ?? payload.message,
    at: new Date().toISOString(),
  };
}

export function buildAlertEvent(
  payload: AlertPayload,
  options: EventBuilderOptions
): EventEnvelope<AlertPayload> {
  return {
    kind: 'event',
    seq: options.seq,
    type: 'alert',
    threadId: options.threadId,
    payload,
    ui: options.ui,
    fallbackText: options.fallbackText ?? `${payload.title}: ${payload.message}`,
    at: new Date().toISOString(),
  };
}

export function buildGoalUpdatedEvent(
  payload: GoalUpdatedPayload,
  options: EventBuilderOptions
): EventEnvelope<GoalUpdatedPayload> {
  return {
    kind: 'event',
    seq: options.seq,
    type: 'goal_updated',
    threadId: options.threadId,
    payload,
    ui: options.ui,
    fallbackText: options.fallbackText,
    at: new Date().toISOString(),
  };
}

export function buildAckEvent(
  payload: AckPayload,
  options: EventBuilderOptions
): EventEnvelope<AckPayload> {
  return {
    kind: 'event',
    seq: options.seq,
    type: 'ack',
    threadId: options.threadId,
    payload,
    ui: options.ui,
    fallbackText: options.fallbackText,
    at: new Date().toISOString(),
  };
}

export function buildErrorEvent(
  payload: ErrorPayload,
  options: EventBuilderOptions
): EventEnvelope<ErrorPayload> {
  return {
    kind: 'event',
    seq: options.seq,
    type: 'error',
    threadId: options.threadId,
    payload,
    ui: options.ui,
    fallbackText: options.fallbackText ?? `Error: ${payload.message}`,
    at: new Date().toISOString(),
  };
}
