/**
 * Zod schemas for event validation.
 */

import { z } from 'zod';
import { utcDateTimeSchema } from './iso.js';
import { serverUISchema } from './ui.js';
import { researchReviewAskSchema } from './research.js';

export const eventTypeSchema = z.enum([
  'message',
  'ask',
  'ask_resolved',
  'status',
  'alert',
  'goal_updated',
  'ack',
  'error',
]);

export const messagePayloadSchema = z.object({
  text: z.string().min(1),
  source: z.enum(['brain', 'system', 'user']),
  replyTo: z.string().optional(),
});

export const questionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

export const questionSchema = z.object({
  id: z.string(),
  type: z.enum(['choice', 'number', 'text', 'confirm']),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  options: z.array(questionOptionSchema).optional(),
  constraints: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional(),
      pattern: z.string().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
    })
    .optional(),
});

export const askPayloadSchema = z
  .object({
    askId: z.uuid(),
    askType: z.enum(['clarify', 'action_approval', 'plan_approval', 'research_review']),
    title: z.string().min(1),
    description: z.string().optional(),
    blocking: z.boolean(),
    costEffect: z
      .object({
        current: z.number(),
        proposed: z.number(),
        currency: z.string().length(3),
        impact: z.string(),
      })
      .optional(),
    risk: z.enum(['low', 'medium', 'high']),
    expiresAt: utcDateTimeSchema.optional(),
    onExpire: z.enum(['deny', 'default', 'escalate']).optional(),
    questions: z.array(questionSchema).min(1).max(3),
    research: researchReviewAskSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.askType === 'research_review') {
      if (!data.research) {
        ctx.addIssue({
          code: 'custom',
          message: 'askType research_review requires payload.research bound to the current artifact revision',
          path: ['research'],
        });
      }
      if (data.costEffect !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message:
            'research_review is not spend approval; omit costEffect so this is not rendered as a budget card',
          path: ['costEffect'],
        });
      }
      if (data.onExpire !== undefined && data.onExpire !== 'deny') {
        ctx.addIssue({
          code: 'custom',
          message: 'research_review onExpire must be deny; absence of an answer is not acceptance',
          path: ['onExpire'],
        });
      }
      for (let i = 0; i < data.questions.length; i += 1) {
        if (data.questions[i].default !== undefined) {
          ctx.addIssue({
            code: 'custom',
            message:
              'research_review questions must not set default; never auto-prefill the landing URL',
            path: ['questions', i, 'default'],
          });
        }
      }
    } else if (data.research !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'payload.research is only valid on askType research_review',
        path: ['research'],
      });
    }
  });

export const askResolvedPayloadSchema = z.object({
  askId: z.uuid(),
  resolution: z.enum(['answered', 'expired', 'superseded']),
  answer: z
    .object({
      choice: z.enum(['approve', 'reject', 'edit']),
      values: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

export const statusPayloadSchema = z.object({
  state: z.enum(['idle', 'thinking', 'executing', 'waiting', 'error']),
  message: z.string().optional(),
  progress: z
    .object({
      current: z.number().nonnegative(),
      total: z.number().positive(),
      label: z.string().optional(),
    })
    .optional(),
});

export const alertPayloadSchema = z.object({
  severity: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string().min(1),
  message: z.string().min(1),
  actionable: z.boolean().optional(),
  dismissible: z.boolean().optional(),
});

export const goalUpdatedPayloadSchema = z.object({
  goalId: z.uuid(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']),
  progress: z
    .object({
      completed: z.number().nonnegative(),
      total: z.number().positive(),
      milestones: z
        .array(
          z.object({
            name: z.string(),
            completed: z.boolean(),
          })
        )
        .optional(),
    })
    .optional(),
  metrics: z
    .object({
      spend: z.number().nonnegative(),
      impressions: z.number().nonnegative(),
      clicks: z.number().nonnegative(),
      conversions: z.number().nonnegative(),
    })
    .optional(),
});

export const ackPayloadSchema = z.object({
  clientMsgId: z.uuid(),
  processed: z.boolean(),
});

export const errorPayloadSchema = z.object({
  code: z.enum([
    'ask_expired',
    'forbidden',
    'policy_denied',
    'validation_error',
    'not_found',
    'conflict',
    'rate_limited',
    'internal',
  ]),
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
  retryable: z.boolean(),
});

export const eventEnvelopeSchema = z.object({
  kind: z.literal('event'),
  seq: z.number().int().nonnegative(),
  type: eventTypeSchema,
  threadId: z.uuid().optional(),
  payload: z.unknown(),
  ui: serverUISchema.optional(),
  fallbackText: z.string().optional(),
  at: utcDateTimeSchema,
});

export function validateEventPayload(type: string, payload: unknown): boolean {
  switch (type) {
    case 'message':
      return messagePayloadSchema.safeParse(payload).success;
    case 'ask':
      return askPayloadSchema.safeParse(payload).success;
    case 'ask_resolved':
      return askResolvedPayloadSchema.safeParse(payload).success;
    case 'status':
      return statusPayloadSchema.safeParse(payload).success;
    case 'alert':
      return alertPayloadSchema.safeParse(payload).success;
    case 'goal_updated':
      return goalUpdatedPayloadSchema.safeParse(payload).success;
    case 'ack':
      return ackPayloadSchema.safeParse(payload).success;
    case 'error':
      return errorPayloadSchema.safeParse(payload).success;
    default:
      return false;
  }
}
