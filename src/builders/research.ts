/**
 * Hub-authored research review ask. Not a brain/tool mapper.
 * Model tool text is not user-supplied input and is not research acceptance.
 */

import type { EventEnvelope, AskPayload, Question } from '../types/event.js';
import type { ServerUI } from '../types/ui.js';
import type { ResearchReviewAsk } from '../types/research.js';
import { RESEARCH_ACCEPT_VERB } from '../schemas/research.js';
import { buildAskEvent, type EventBuilderOptions } from './event.js';

const ACCEPT_QUESTION: Question = {
  id: 'research-accept',
  type: 'confirm',
  label: 'Accept this sourced research for the current operator-entered landing URL?',
  required: true,
};

export interface ResearchReviewAskInput {
  askId: string;
  research: ResearchReviewAsk;
  title?: string;
  description?: string;
  expiresAt?: string;
}

export function researchReviewFallbackText(research: ResearchReviewAsk): string {
  return [
    `Research review (${RESEARCH_ACCEPT_VERB}) for ${research.landingPageUrl}`,
    `artifact ${research.artifactId} v${research.version} revision ${research.inputRevision}`,
    'Accepting this review does not grant spend or bypass budget policy.',
    'Context packets are not research.',
    '',
    'Findings:',
    ...research.findings.map((row) => `- ${row.text}`),
    '',
    'Assumptions:',
    ...research.assumptions.map((row) => `- ${row.text}`),
    '',
    'Unknowns:',
    ...research.unknowns.map((row) => `- ${row.text}`),
    '',
    'Sources:',
    ...research.sources.map((row) => `- ${row.url} (${row.sha256.slice(0, 12)}…)`),
  ].join('\n');
}

/**
 * Build a blocking `research_review` ask. Hub copies ids from the gateway
 * snapshot (`needs[0].verb = research.accept`); it must not invent artifact
 * identity from model fields. `costEffect` is omitted: accepting research is
 * not spend approval.
 */
export function buildResearchReviewAskPayload(input: ResearchReviewAskInput): AskPayload {
  return {
    askId: input.askId,
    askType: 'research_review',
    title: input.title ?? 'Review sourced research',
    description:
      input.description ??
      'Accept findings, assumptions, and unknowns for this landing-URL revision. Edit invalidates acceptance. This is not campaign spend approval.',
    blocking: true,
    risk: 'high',
    onExpire: 'deny',
    expiresAt: input.expiresAt,
    questions: [{ ...ACCEPT_QUESTION }],
    research: input.research,
  };
}

export function buildResearchReviewAskEvent(
  input: ResearchReviewAskInput,
  options: Omit<EventBuilderOptions, 'fallbackText'> & { fallbackText?: string }
): EventEnvelope<AskPayload> {
  const payload = buildResearchReviewAskPayload(input);
  const ui: ServerUI = {
    component: 'confirm',
    version: '1.0.0',
    props: {
      title: payload.title,
      message: payload.description,
      confirmLabel: 'Accept research',
      cancelLabel: 'Reject',
      risk: 'high',
    },
  };
  return buildAskEvent(payload, {
    ...options,
    ui: options.ui ?? ui,
    fallbackText: options.fallbackText ?? researchReviewFallbackText(input.research),
  });
}
