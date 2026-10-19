/**
 * Type guard functions for runtime type checking.
 */

import type { CommandEnvelope, CommandType } from '../types/command.js';
import type { EventEnvelope, EventType } from '../types/event.js';
import type { BrainOutput, BrainOutputType } from '../types/brain.js';

export function isCommandEnvelope(value: unknown): value is CommandEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'command' &&
    'clientMsgId' in value &&
    'type' in value &&
    'payload' in value &&
    'sentAt' in value
  );
}

export function isEventEnvelope(value: unknown): value is EventEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'event' &&
    'seq' in value &&
    'type' in value &&
    'payload' in value &&
    'at' in value
  );
}

export function isCommandType(value: unknown): value is CommandType {
  return (
    typeof value === 'string' &&
    [
      'send_message',
      'answer_ask',
      'create_goal',
      'approve_plan',
      'control',
      'explain',
      'mark_read',
    ].includes(value)
  );
}

export function isEventType(value: unknown): value is EventType {
  return (
    typeof value === 'string' &&
    [
      'message',
      'ask',
      'ask_resolved',
      'status',
      'alert',
      'goal_updated',
      'ack',
      'error',
    ].includes(value)
  );
}

export function isBrainOutputType(value: unknown): value is BrainOutputType {
  return (
    typeof value === 'string' &&
    ['reply', 'clarify', 'plan', 'tool_call', 'decision', 'explain'].includes(
      value
    )
  );
}

export function isBrainOutput(value: unknown): value is BrainOutput {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    isBrainOutputType(value.type)
  );
}
