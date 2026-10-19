/**
 * Server-driven UI component types.
 * Components have versioned schemas - clients must gracefully fall back to fallbackText
 * for unknown component types or versions.
 */

export type ComponentType =
  | 'text'
  | 'plan_card'
  | 'approval_card'
  | 'question_choice'
  | 'question_text'
  | 'metric_tile'
  | 'metric_chart'
  | 'table'
  | 'spend_bar'
  | 'status_banner'
  | 'alert'
  | 'timeline_item'
  | 'goal_summary'
  | 'form'
  | 'number_input'
  | 'select'
  | 'confirm';

export type ActionStyle = 'primary' | 'default' | 'danger';

export interface UIAction {
  id: string;
  label: string;
  style?: ActionStyle;
  command?: Record<string, unknown>;
  opens?: ServerUI;
}

export interface ServerUI<P = unknown> {
  component: ComponentType;
  version: string;
  props: P;
  actions?: UIAction[];
}

export interface TextProps {
  text: string;
  markdown?: boolean;
  emphasis?: 'normal' | 'bold' | 'italic';
}

export interface PlanCardProps {
  title: string;
  description: string;
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    estimatedCost?: number;
  }>;
  totalEstimatedCost?: number;
  currency?: string;
}

export interface ApprovalCardProps {
  title: string;
  description: string;
  action: string;
  currentValue?: string;
  proposedValue?: string;
  risk: 'low' | 'medium' | 'high';
  costImpact?: {
    current: number;
    proposed: number;
    currency: string;
  };
}

export interface QuestionChoiceProps {
  question: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  allowMultiple?: boolean;
  default?: string | string[];
}

export interface QuestionTextProps {
  question: string;
  placeholder?: string;
  multiline?: boolean;
  default?: string;
  maxLength?: number;
}

export interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  status?: 'good' | 'warning' | 'bad' | 'neutral';
}

export interface MetricChartProps {
  title: string;
  type: 'line' | 'bar' | 'area';
  data: Array<{
    label: string;
    value: number;
    timestamp?: string;
  }>;
  xAxis: string;
  yAxis: string;
  currency?: string;
}

export interface TableProps {
  headers: string[];
  rows: Array<Array<string | number>>;
  sortable?: boolean;
  caption?: string;
}

export interface SpendBarProps {
  spent: number;
  budget: number;
  currency: string;
  period?: string;
  showPercentage?: boolean;
}

export interface StatusBannerProps {
  status: 'idle' | 'thinking' | 'executing' | 'waiting' | 'error';
  message: string;
  progress?: number;
}

export interface AlertProps {
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  dismissible?: boolean;
}

export interface TimelineItemProps {
  timestamp: string;
  title: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  metadata?: Record<string, string | number>;
}

export interface GoalSummaryProps {
  title: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  progress: number;
  metrics: {
    spend: number;
    budget: number;
    currency: string;
    impressions?: number;
    clicks?: number;
    conversions?: number;
  };
}

export interface FormProps {
  fields: Array<{
    id: string;
    type: 'text' | 'number' | 'select' | 'confirm';
    label: string;
    required?: boolean;
    default?: unknown;
    options?: Array<{ value: string; label: string }>;
    constraints?: Record<string, unknown>;
  }>;
}

export interface NumberInputProps {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  default?: number;
}

export interface SelectProps {
  label: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  default?: string;
  multiple?: boolean;
}

export interface ConfirmProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  risk?: 'low' | 'medium' | 'high';
}
