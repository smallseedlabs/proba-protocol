/**
 * Mapping functions from brain outputs to protocol events.
 * This bridges the LLM brain outputs to the Proba protocol.
 */

import type {
  BrainOutput,
  BrainReply,
  BrainClarify,
  BrainPlan,
  BrainToolCall,
  BrainDecision,
  BrainExplain,
} from '../types/brain.js';
import type {
  EventEnvelope,
  MessagePayload,
  AskPayload,
  Question,
} from '../types/event.js';
import type { ServerUI } from '../types/ui.js';
import {
  buildMessageEvent,
  buildAskEvent,
} from '../builders/event.js';
import { randomUUID } from 'crypto';

export interface MappingContext {
  seq: number;
  threadId?: string;
}

/**
 * Maps a brain reply to a message event.
 */
export function mapReplyToEvent(
  reply: BrainReply,
  context: MappingContext
): EventEnvelope<MessagePayload> {
  const payload: MessagePayload = {
    text: reply.text,
    source: 'brain',
  };

  const ui: ServerUI = {
    component: 'text',
    version: '1.0.0',
    props: {
      text: reply.text,
      markdown: true,
    },
  };

  return buildMessageEvent(payload, {
    seq: context.seq,
    threadId: context.threadId,
    ui,
  });
}

/**
 * Maps a brain clarify request to an ask event with question components.
 */
export function mapClarifyToEvent(
  clarify: BrainClarify,
  context: MappingContext
): EventEnvelope<AskPayload> {
  const questions: Question[] = clarify.questions.map((q) => ({
    id: q.id,
    type: q.type,
    label: q.text,
    required: true,
    options: q.options,
    constraints: q.constraints,
  }));

  const payload: AskPayload = {
    askId: randomUUID(),
    askType: 'clarify',
    title: 'Need clarification',
    description: clarify.reason,
    blocking: true,
    risk: 'low',
    questions,
  };

  const ui: ServerUI = {
    component: questions[0].type === 'choice' ? 'question_choice' : 'question_text',
    version: '1.0.0',
    props:
      questions[0].type === 'choice'
        ? {
            question: questions[0].label,
            options: questions[0].options ?? [],
          }
        : {
            question: questions[0].label,
          },
  };

  return buildAskEvent(payload, {
    seq: context.seq,
    threadId: context.threadId,
    ui,
    fallbackText: `${clarify.reason}\n\n${questions.map((q) => `- ${q.label}`).join('\n')}`,
  });
}

/**
 * Maps a brain plan to an ask event with plan_card UI.
 */
export function mapPlanToEvent(
  plan: BrainPlan,
  context: MappingContext
): EventEnvelope<AskPayload> {
  const payload: AskPayload = {
    askId: randomUUID(),
    askType: 'plan_approval',
    title: plan.title,
    description: plan.description,
    blocking: true,
    risk: 'medium',
    questions: [
      {
        id: 'approval',
        type: 'confirm',
        label: 'Do you approve this plan?',
        required: true,
      },
    ],
  };

  const ui: ServerUI = {
    component: 'plan_card',
    version: '1.0.0',
    props: {
      title: plan.title,
      description: plan.description,
      steps: plan.steps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        status: 'pending',
        estimatedCost: step.estimatedCost,
      })),
      totalEstimatedCost: plan.totalCost,
      currency: 'USD',
    },
    actions: [
      {
        id: 'approve',
        label: 'Approve Plan',
        style: 'primary',
        command: {
          type: 'approve_plan',
          payload: { planId: payload.askId, approved: true },
        },
      },
      {
        id: 'reject',
        label: 'Reject',
        style: 'danger',
        command: {
          type: 'approve_plan',
          payload: { planId: payload.askId, approved: false },
        },
      },
    ],
  };

  return buildAskEvent(payload, {
    seq: context.seq,
    threadId: context.threadId,
    ui,
    fallbackText: `Plan: ${plan.title}\n${plan.description}\n\nSteps:\n${plan.steps.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}`,
  });
}

/**
 * Maps a brain tool call to an ask event with approval_card UI.
 */
export function mapToolCallToEvent(
  toolCall: BrainToolCall,
  context: MappingContext
): EventEnvelope<AskPayload> {
  const currentValue = JSON.stringify(toolCall.parameters, null, 2);

  const payload: AskPayload = {
    askId: randomUUID(),
    askType: 'action_approval',
    title: `Approve tool call: ${toolCall.tool}`,
    description: `The brain wants to call ${toolCall.tool}`,
    blocking: toolCall.needsApproval,
    risk: toolCall.risk,
    costEffect: toolCall.costImpact
      ? {
          current: toolCall.costImpact.current,
          proposed: toolCall.costImpact.proposed,
          currency: 'USD',
          impact: `${((toolCall.costImpact.proposed / toolCall.costImpact.current - 1) * 100).toFixed(1)}%`,
        }
      : undefined,
    questions: [
      {
        id: 'approval',
        type: 'choice',
        label: 'Action',
        required: true,
        options: [
          { value: 'approve', label: 'Approve' },
          { value: 'reject', label: 'Reject' },
          { value: 'edit', label: 'Edit parameters' },
        ],
      },
    ],
  };

  const ui: ServerUI = {
    component: 'approval_card',
    version: '1.0.0',
    props: {
      title: `Tool: ${toolCall.tool}`,
      description: `Risk: ${toolCall.risk}`,
      action: 'Execute tool call',
      currentValue: currentValue,
      proposedValue: currentValue,
      risk: toolCall.risk,
      costImpact: toolCall.costImpact
        ? {
            current: toolCall.costImpact.current,
            proposed: toolCall.costImpact.proposed,
            currency: 'USD',
          }
        : undefined,
    },
  };

  return buildAskEvent(payload, {
    seq: context.seq,
    threadId: context.threadId,
    ui,
  });
}

/**
 * Maps a brain decision to a message event.
 */
export function mapDecisionToEvent(
  decision: BrainDecision,
  context: MappingContext
): EventEnvelope<MessagePayload> {
  const decisionText = `Decision: ${decision.decision.toUpperCase()} for ${decision.target}\n\nEvidence:\n${decision.evidence.map((e) => `- ${e}`).join('\n')}\n\nConfidence: ${(decision.confidence * 100).toFixed(0)}%${decision.recommendation ? `\n\nRecommendation: ${decision.recommendation}` : ''}`;

  const payload: MessagePayload = {
    text: decisionText,
    source: 'brain',
  };

  const ui: ServerUI = {
    component: 'text',
    version: '1.0.0',
    props: {
      text: decisionText,
      markdown: true,
      emphasis: 'bold',
    },
  };

  return buildMessageEvent(payload, {
    seq: context.seq,
    threadId: context.threadId,
    ui,
  });
}

/**
 * Maps a brain explanation to a message event.
 */
export function mapExplainToEvent(
  explain: BrainExplain,
  context: MappingContext
): EventEnvelope<MessagePayload> {
  let text = `Explanation for ${explain.target}:\n\n${explain.explanation}`;

  if (explain.details) {
    text += '\n\nDetails:\n';
    for (const [key, value] of Object.entries(explain.details)) {
      text += `- ${key}: ${JSON.stringify(value)}\n`;
    }
  }

  const payload: MessagePayload = {
    text,
    source: 'brain',
  };

  const ui: ServerUI = {
    component: 'text',
    version: '1.0.0',
    props: {
      text,
      markdown: true,
    },
  };

  return buildMessageEvent(payload, {
    seq: context.seq,
    threadId: context.threadId,
    ui,
  });
}

/**
 * Main mapping function that routes brain outputs to appropriate event builders.
 */
export function mapBrainOutputToEvent(
  output: BrainOutput,
  context: MappingContext
): EventEnvelope {
  switch (output.type) {
    case 'reply':
      return mapReplyToEvent(output, context);
    case 'clarify':
      return mapClarifyToEvent(output, context);
    case 'plan':
      return mapPlanToEvent(output, context);
    case 'tool_call':
      return mapToolCallToEvent(output, context);
    case 'decision':
      return mapDecisionToEvent(output, context);
    case 'explain':
      return mapExplainToEvent(output, context);
  }
}
