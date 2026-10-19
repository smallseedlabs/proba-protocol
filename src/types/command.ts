/**
 * Command envelope and payload types.
 * Commands are sent from client to server.
 */

export type CommandType =
  | 'send_message'
  | 'answer_ask'
  | 'create_goal'
  | 'approve_plan'
  | 'control'
  | 'explain'
  | 'mark_read';

export interface CommandEnvelope<T = unknown> {
  kind: 'command';
  clientMsgId: string;
  type: CommandType;
  threadId?: string;
  payload: T;
  sentAt: string;
}

export interface SendMessagePayload {
  text: string;
  attachments?: Array<{
    type: 'image' | 'file';
    url: string;
    name?: string;
    mimeType?: string;
  }>;
}

export type AskChoice = 'approve' | 'reject' | 'edit';

export interface AnswerAskPayload {
  askId: string;
  choice: AskChoice;
  values?: Record<string, unknown>;
  edit?: string;
}

export interface CreateGoalPayload {
  title: string;
  description?: string;
  constraints?: string[];
  budget?: {
    daily: number;
    total?: number;
    currency: string;
  };
}

export interface ApprovePlanPayload {
  planId: string;
  approved: boolean;
  modifications?: string;
}

export type ControlAction = 'pause' | 'resume' | 'kill';

export interface ControlPayload {
  action: ControlAction;
  target?: string;
}

export interface ExplainPayload {
  targetRef: string;
}

export interface MarkReadPayload {
  upToSeq: number;
}
