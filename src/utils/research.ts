/**
 * Research review acceptance helpers. I/O-free: Hub still owns persistence,
 * gateway resume, and spend policy. Matching ids is not a spend grant.
 */

import type { AnswerAskPayload } from '../types/command.js';
import type { AskPayload } from '../types/event.js';
import {
  researchAcceptanceMatches,
  type ResearchAcceptanceBinding,
} from '../schemas/research.js';

export type ResearchReviewAnswerOutcome =
  | 'accepted'
  | 'rejected'
  | 'invalidated'
  | 'mismatch'
  | 'invalid';

export interface ResearchReviewAnswerResult {
  outcome: ResearchReviewAnswerOutcome;
  message: string;
  /** Always false: research acceptance does not bypass spend policies. */
  grantsSpend: false;
}

function bindingFromAsk(ask: AskPayload): ResearchAcceptanceBinding | undefined {
  if (!ask.research) return undefined;
  return {
    artifactId: ask.research.artifactId,
    version: ask.research.version,
    inputRevision: ask.research.inputRevision,
  };
}

/**
 * Hub uses this after validating the command envelope. `approve` marks this
 * artifact version accepted only when researchAcceptance matches the ask.
 * `edit` invalidates; a new URL is a new input revision and requires gather
 * again. `reject` leaves the artifact unaccepted.
 */
export function evaluateResearchReviewAnswer(
  ask: AskPayload,
  answer: AnswerAskPayload
): ResearchReviewAnswerResult {
  const noSpend = { grantsSpend: false as const };
  if (ask.askType !== 'research_review' || !ask.research) {
    return {
      outcome: 'invalid',
      message: 'evaluateResearchReviewAnswer applies only to askType research_review',
      ...noSpend,
    };
  }
  if (answer.askId !== ask.askId) {
    return { outcome: 'mismatch', message: 'answer askId does not match the research review ask', ...noSpend };
  }
  if (!answer.researchAcceptance) {
    return {
      outcome: 'mismatch',
      message:
        'research_review answers require researchAcceptance bound to the current artifactId, version, and inputRevision',
      ...noSpend,
    };
  }
  const expected = bindingFromAsk(ask);
  if (!expected || !researchAcceptanceMatches(ask.research, answer.researchAcceptance)) {
    return {
      outcome: 'mismatch',
      message:
        'researchAcceptance does not match the current artifact revision; stale or model-supplied ids are not acceptance',
      ...noSpend,
    };
  }
  if (answer.choice === 'approve') {
    return {
      outcome: 'accepted',
      message:
        'Research artifact version accepted for this input revision. Spend policies, budget caps, and ads.create_campaign approval still apply.',
      ...noSpend,
    };
  }
  if (answer.choice === 'edit') {
    return {
      outcome: 'invalidated',
      message: answer.userSuppliedInput
        ? 'Acceptance invalidated. Hub must gather and accept the new userSuppliedInput landing URL revision before create.'
        : 'Acceptance invalidated. Collect a replacement operator URL (new input revision) or re-gather the current URL; create stays blocked.',
      ...noSpend,
    };
  }
  return {
    outcome: 'rejected',
    message: 'Research artifact left unaccepted. ads.create_campaign stays blocked.',
    ...noSpend,
  };
}
