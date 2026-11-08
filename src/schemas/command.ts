/**
 * Zod schemas for command validation.
 */

import { z } from 'zod';
import { researchAcceptanceBindingSchema, userSuppliedInputSchema } from './research.js';

export const commandTypeSchema = z.enum([
  'send_message',
  'answer_ask',
  'create_goal',
  'approve_plan',
  'control',
  'explain',
  'mark_read',
]);

export const sendMessagePayloadSchema = z.object({
  text: z.string().min(1).max(10000),
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'file']),
        url: z.string().url(),
        name: z.string().optional(),
        mimeType: z.string().optional(),
      })
    )
    .optional(),
});

export const answerAskPayloadSchema = z
  .object({
    askId: z.string().uuid(),
    choice: z.enum(['approve', 'reject', 'edit']),
    values: z.record(z.unknown()).optional(),
    edit: z.string().optional(),
    researchAcceptance: researchAcceptanceBindingSchema.optional(),
    userSuppliedInput: userSuppliedInputSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.userSuppliedInput !== undefined && data.choice !== 'edit') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'userSuppliedInput on answer_ask is only allowed with choice=edit; approve/reject must not change the landing URL',
        path: ['userSuppliedInput'],
      });
    }
  });

export const createGoalPayloadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  constraints: z.array(z.string()).optional(),
  budget: z
    .object({
      daily: z.number().positive(),
      total: z.number().positive().optional(),
      currency: z.string().length(3),
    })
    .optional(),
  userSuppliedInput: userSuppliedInputSchema.optional(),
});

export const approvePlanPayloadSchema = z.object({
  planId: z.string().uuid(),
  approved: z.boolean(),
  modifications: z.string().optional(),
});

export const controlPayloadSchema = z.object({
  action: z.enum(['pause', 'resume', 'kill']),
  target: z.string().optional(),
});

export const explainPayloadSchema = z.object({
  targetRef: z.string().min(1),
});

export const markReadPayloadSchema = z.object({
  upToSeq: z.number().int().nonnegative(),
});

export const commandEnvelopeSchema = z.object({
  kind: z.literal('command'),
  clientMsgId: z.string().uuid(),
  type: commandTypeSchema,
  threadId: z.string().uuid().optional(),
  payload: z.unknown(),
  sentAt: z.string().datetime(),
});

export function validateCommandPayload(type: string, payload: unknown): boolean {
  switch (type) {
    case 'send_message':
      return sendMessagePayloadSchema.safeParse(payload).success;
    case 'answer_ask':
      return answerAskPayloadSchema.safeParse(payload).success;
    case 'create_goal':
      return createGoalPayloadSchema.safeParse(payload).success;
    case 'approve_plan':
      return approvePlanPayloadSchema.safeParse(payload).success;
    case 'control':
      return controlPayloadSchema.safeParse(payload).success;
    case 'explain':
      return explainPayloadSchema.safeParse(payload).success;
    case 'mark_read':
      return markReadPayloadSchema.safeParse(payload).success;
    default:
      return false;
  }
}
