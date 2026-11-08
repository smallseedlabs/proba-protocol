/**
 * Public API surface for 0.5.0 must stay additive on 0.4.0.
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as root from '../src/index.js';
import { createGoalPayloadSchema, answerAskPayloadSchema } from '../src/schemas/command.js';
import { askPayloadSchema } from '../src/schemas/event.js';

const bundle = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../schemas/index.json'), 'utf8')
) as {
  version: string;
  definitions: Record<string, { definitions?: Record<string, { properties?: Record<string, unknown>; additionalProperties?: boolean }> }>;
};

const V040_STILL_PRESENT = [
  'stepTypeSchema',
  'contextRequestSchema',
  'contextPacketSchema',
  'KNOWN_GAP_CODES',
  'commandEnvelopeSchema',
  'eventEnvelopeSchema',
  'buildAuditEvent',
  'validateAuditEvent',
] as const;

const V050_NEW = [
  'userSuppliedInputSchema',
  'researchArtifactSchema',
  'researchReviewAskSchema',
  'researchAcceptanceBindingSchema',
  'landingPageUrlSchema',
  'parseLandingPageUrl',
  'researchFindingsAreSourced',
  'canAcceptResearchArtifact',
  'researchAcceptanceMatches',
  'evaluateResearchReviewAnswer',
  'buildResearchReviewAskEvent',
  'buildResearchReviewAskPayload',
  'RESEARCH_ACCEPT_VERB',
  'LANDING_PAGE_URL_MAX',
  'isHubMediatedResearchVerb',
] as const;

describe('public API surface 0.5.0 (additive)', () => {
  it('keeps listed 0.4.0 root exports', () => {
    for (const name of V040_STILL_PRESENT) {
      expect(root).toHaveProperty(name);
    }
  });

  it('exports the research review symbols from the root', () => {
    for (const name of V050_NEW) {
      expect(root).toHaveProperty(name);
      expect((root as Record<string, unknown>)[name]).toBeDefined();
    }
  });

  it('still parses a 0.4.0-shaped create_goal and clarify ask', () => {
    expect(createGoalPayloadSchema.safeParse({ title: 'Launch Q4 Product Campaign' }).success).toBe(
      true
    );
    expect(answerAskPayloadSchema.safeParse({
      askId: '550e8400-e29b-41d4-a716-446655440000',
      choice: 'approve',
    }).success).toBe(true);
    expect(
      askPayloadSchema.safeParse({
        askId: '550e8400-e29b-41d4-a716-446655440000',
        askType: 'clarify',
        title: 'Need more info',
        blocking: true,
        risk: 'low',
        questions: [{ id: 'q1', type: 'text', label: 'What is your budget?' }],
      }).success
    ).toBe(true);
  });

  it('includes research definitions in the generated JSON Schema bundle without a default URL', () => {
    for (const name of [
      'UserSuppliedInput',
      'ResearchArtifact',
      'ResearchReviewAsk',
      'ResearchAcceptanceBinding',
      'LandingPageUrl',
    ]) {
      expect(bundle.definitions[name]).toBeDefined();
    }
    const input = bundle.definitions.UserSuppliedInput as {
      additionalProperties?: boolean;
      properties?: Record<string, unknown>;
    };
    expect(input.additionalProperties).toBe(false);
    expect(input.properties?.landingPageUrl).toMatchObject({ minLength: 1, maxLength: 2048 });
    expect(JSON.stringify(bundle.definitions.UserSuppliedInput)).not.toMatch(/smallseedlabs\.com/);
    expect(JSON.stringify(bundle.definitions.UserSuppliedInput)).not.toMatch(/"default"\s*:/);
  });
});
