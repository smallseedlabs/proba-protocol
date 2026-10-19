/**
 * Brain output types.
 * These represent the outputs from the LLM brain that need to be mapped to protocol events.
 */

export type BrainOutputType =
  | 'reply'
  | 'clarify'
  | 'plan'
  | 'tool_call'
  | 'decision'
  | 'explain';

export interface BrainReply {
  type: 'reply';
  text: string;
  confidence?: number;
}

export interface BrainClarify {
  type: 'clarify';
  reason: string;
  questions: Array<{
    id: string;
    text: string;
    type: 'choice' | 'number' | 'text' | 'confirm';
    options?: Array<{ value: string; label: string }>;
    constraints?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
  }>;
}

export interface BrainPlan {
  type: 'plan';
  title: string;
  description: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    estimatedCost?: number;
  }>;
  totalCost?: number;
}

export interface BrainToolCall {
  type: 'tool_call';
  tool: string;
  parameters: Record<string, unknown>;
  needsApproval: boolean;
  risk: 'low' | 'medium' | 'high';
  costImpact?: {
    current: number;
    proposed: number;
  };
}

export type DecisionType = 'keep' | 'change' | 'kill';

export interface BrainDecision {
  type: 'decision';
  decision: DecisionType;
  target: string;
  evidence: string[];
  confidence: number;
  recommendation?: string;
}

export interface BrainExplain {
  type: 'explain';
  target: string;
  explanation: string;
  details?: Record<string, unknown>;
}

export type BrainOutput =
  | BrainReply
  | BrainClarify
  | BrainPlan
  | BrainToolCall
  | BrainDecision
  | BrainExplain;
