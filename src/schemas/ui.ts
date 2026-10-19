/**
 * Zod schemas for UI component validation.
 */

import { z } from 'zod';

export const componentTypeSchema = z.enum([
  'text',
  'plan_card',
  'approval_card',
  'question_choice',
  'question_text',
  'metric_tile',
  'metric_chart',
  'table',
  'spend_bar',
  'status_banner',
  'alert',
  'timeline_item',
  'goal_summary',
  'form',
  'number_input',
  'select',
  'confirm',
]);

export const actionStyleSchema = z.enum(['primary', 'default', 'danger']);

export const uiActionSchema: z.ZodLazy<z.ZodObject<{
  id: z.ZodString;
  label: z.ZodString;
  style: z.ZodOptional<z.ZodEnum<['primary', 'default', 'danger']>>;
  command: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  opens: z.ZodOptional<z.ZodLazy<z.ZodTypeAny>>;
}>> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    style: actionStyleSchema.optional(),
    command: z.record(z.unknown()).optional(),
    opens: serverUISchema.optional(),
  })
);

export const serverUISchema: z.ZodLazy<z.ZodObject<{
  component: typeof componentTypeSchema;
  version: z.ZodString;
  props: z.ZodUnknown;
  actions: z.ZodOptional<z.ZodArray<typeof uiActionSchema>>;
}>> = z.lazy(() =>
  z.object({
    component: componentTypeSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    props: z.unknown(),
    actions: z.array(uiActionSchema).optional(),
  })
);

export const textPropsSchema = z.object({
  text: z.string(),
  markdown: z.boolean().optional(),
  emphasis: z.enum(['normal', 'bold', 'italic']).optional(),
});

export const planCardPropsSchema = z.object({
  title: z.string(),
  description: z.string(),
  steps: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
      estimatedCost: z.number().optional(),
    })
  ),
  totalEstimatedCost: z.number().optional(),
  currency: z.string().optional(),
});

export const approvalCardPropsSchema = z.object({
  title: z.string(),
  description: z.string(),
  action: z.string(),
  currentValue: z.string().optional(),
  proposedValue: z.string().optional(),
  risk: z.enum(['low', 'medium', 'high']),
  costImpact: z
    .object({
      current: z.number(),
      proposed: z.number(),
      currency: z.string(),
    })
    .optional(),
});

export const questionChoicePropsSchema = z.object({
  question: z.string(),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      description: z.string().optional(),
    })
  ),
  allowMultiple: z.boolean().optional(),
  default: z.union([z.string(), z.array(z.string())]).optional(),
});

export const questionTextPropsSchema = z.object({
  question: z.string(),
  placeholder: z.string().optional(),
  multiline: z.boolean().optional(),
  default: z.string().optional(),
  maxLength: z.number().optional(),
});

export const metricTilePropsSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  trend: z
    .object({
      direction: z.enum(['up', 'down', 'stable']),
      percentage: z.number(),
    })
    .optional(),
  status: z.enum(['good', 'warning', 'bad', 'neutral']).optional(),
});

export const metricChartPropsSchema = z.object({
  title: z.string(),
  type: z.enum(['line', 'bar', 'area']),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      timestamp: z.string().optional(),
    })
  ),
  xAxis: z.string(),
  yAxis: z.string(),
  currency: z.string().optional(),
});

export const tablePropsSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number()]))),
  sortable: z.boolean().optional(),
  caption: z.string().optional(),
});

export const spendBarPropsSchema = z.object({
  spent: z.number().nonnegative(),
  budget: z.number().positive(),
  currency: z.string(),
  period: z.string().optional(),
  showPercentage: z.boolean().optional(),
});

export const statusBannerPropsSchema = z.object({
  status: z.enum(['idle', 'thinking', 'executing', 'waiting', 'error']),
  message: z.string(),
  progress: z.number().min(0).max(100).optional(),
});

export const alertPropsSchema = z.object({
  severity: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string(),
  message: z.string(),
  dismissible: z.boolean().optional(),
});

export const timelineItemPropsSchema = z.object({
  timestamp: z.string().datetime(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['completed', 'in_progress', 'pending', 'failed']),
  metadata: z.record(z.union([z.string(), z.number()])).optional(),
});

export const goalSummaryPropsSchema = z.object({
  title: z.string(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']),
  progress: z.number().min(0).max(100),
  metrics: z.object({
    spend: z.number().nonnegative(),
    budget: z.number().positive(),
    currency: z.string(),
    impressions: z.number().nonnegative().optional(),
    clicks: z.number().nonnegative().optional(),
    conversions: z.number().nonnegative().optional(),
  }),
});

export const formPropsSchema = z.object({
  fields: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['text', 'number', 'select', 'confirm']),
      label: z.string(),
      required: z.boolean().optional(),
      default: z.unknown().optional(),
      options: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .optional(),
      constraints: z.record(z.unknown()).optional(),
    })
  ),
});

export const numberInputPropsSchema = z.object({
  label: z.string(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  unit: z.string().optional(),
  default: z.number().optional(),
});

export const selectPropsSchema = z.object({
  label: z.string(),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  default: z.string().optional(),
  multiple: z.boolean().optional(),
});

export const confirmPropsSchema = z.object({
  title: z.string(),
  message: z.string(),
  confirmLabel: z.string().optional(),
  cancelLabel: z.string().optional(),
  risk: z.enum(['low', 'medium', 'high']).optional(),
});
