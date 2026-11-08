/**
 * Command envelope and payload types.
 * Commands are sent from client to server.
 */

import type { ResearchAcceptanceBinding, UserSuppliedInput } from './research.js';

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
  /**
   * Required when answering askType `research_review`. Must equal the ask's
   * artifactId, version, and inputRevision. A mismatch is not acceptance.
   */
  researchAcceptance?: ResearchAcceptanceBinding;
  /**
   * Only with `choice: 'edit'` on a research review: the replacement
   * operator-entered URL. Edit invalidates the current artifact; Hub must
   * gather and accept the new input revision. Never a default URL.
   */
  userSuppliedInput?: UserSuppliedInput;
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
  /**
   * Operator-entered landing URL for this campaign goal. Optional so existing
   * create_goal clients stay valid; research.gather / ads.create_campaign fail
   * closed until Hub sends it. Never defaulted or taken from model text.
   */
  userSuppliedInput?: UserSuppliedInput;
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
