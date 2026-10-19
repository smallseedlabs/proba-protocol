/**
 * Tests for brain-to-protocol mapping.
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapBrainOutputToEvent,
  mapReplyToEvent,
  mapClarifyToEvent,
  mapPlanToEvent,
} from '../../src/mapping/brain-to-protocol.js';
import type { BrainReply, BrainClarify, BrainPlan } from '../../src/types/brain.js';
import { eventEnvelopeSchema } from '../../src/schemas/event.js';

describe('Brain to Protocol Mapping', () => {
  describe('mapReplyToEvent', () => {
    it('should map brain reply to message event', () => {
      const reply: BrainReply = {
        type: 'reply',
        text: 'This is a response from the brain',
        confidence: 0.95,
      };

      const event = mapReplyToEvent(reply, { seq: 1 });

      expect(event.kind).toBe('event');
      expect(event.type).toBe('message');
      expect(event.seq).toBe(1);
      expect(event.payload).toHaveProperty('text', reply.text);
      expect(event.payload).toHaveProperty('source', 'brain');
      expect(event.ui?.component).toBe('text');
      expect(eventEnvelopeSchema.safeParse(event).success).toBe(true);
    });
  });

  describe('mapClarifyToEvent', () => {
    it('should map clarify to ask event with questions', () => {
      const clarify: BrainClarify = {
        type: 'clarify',
        reason: 'Need budget information',
        questions: [
          {
            id: 'budget',
            text: 'What is your daily budget?',
            type: 'number',
            constraints: { min: 10, max: 1000 },
          },
        ],
      };

      const event = mapClarifyToEvent(clarify, { seq: 2 });

      expect(event.kind).toBe('event');
      expect(event.type).toBe('ask');
      expect(event.seq).toBe(2);
      expect(event.payload.askType).toBe('clarify');
      expect(event.payload.questions).toHaveLength(1);
      expect(event.payload.questions[0].id).toBe('budget');
      expect(event.ui?.component).toBe('question_text');
      expect(eventEnvelopeSchema.safeParse(event).success).toBe(true);
    });

    it('should map choice question to question_choice component', () => {
      const clarify: BrainClarify = {
        type: 'clarify',
        reason: 'Select target audience',
        questions: [
          {
            id: 'audience',
            text: 'Who is your target audience?',
            type: 'choice',
            options: [
              { value: 'all', label: 'All users' },
              { value: 'new', label: 'New users only' },
            ],
          },
        ],
      };

      const event = mapClarifyToEvent(clarify, { seq: 3 });

      expect(event.ui?.component).toBe('question_choice');
      expect(event.ui?.props).toHaveProperty('question');
      expect(event.ui?.props).toHaveProperty('options');
    });
  });

  describe('mapPlanToEvent', () => {
    it('should map plan to ask event with plan_card', () => {
      const plan: BrainPlan = {
        type: 'plan',
        title: 'Campaign Launch Plan',
        description: 'A comprehensive plan for launching the campaign',
        steps: [
          {
            id: 'step1',
            title: 'Create ad copy',
            description: 'Write compelling ad text',
            estimatedCost: 20,
          },
          {
            id: 'step2',
            title: 'Set targeting',
            description: 'Configure audience targeting',
            estimatedCost: 30,
          },
        ],
        totalCost: 50,
      };

      const event = mapPlanToEvent(plan, { seq: 4 });

      expect(event.kind).toBe('event');
      expect(event.type).toBe('ask');
      expect(event.payload.askType).toBe('plan_approval');
      expect(event.payload.title).toBe(plan.title);
      expect(event.ui?.component).toBe('plan_card');
      expect(event.ui?.props).toHaveProperty('steps');
      expect(event.ui?.actions).toHaveLength(2);
      expect(event.ui?.actions?.[0].label).toBe('Approve Plan');
      expect(eventEnvelopeSchema.safeParse(event).success).toBe(true);
    });
  });

  describe('mapBrainOutputToEvent', () => {
    it('should route reply to correct mapper', () => {
      const reply: BrainReply = {
        type: 'reply',
        text: 'Hello',
      };

      const event = mapBrainOutputToEvent(reply, { seq: 1 });
      expect(event.type).toBe('message');
    });

    it('should route clarify to correct mapper', () => {
      const clarify: BrainClarify = {
        type: 'clarify',
        reason: 'Need info',
        questions: [
          {
            id: 'q1',
            text: 'Question?',
            type: 'text',
          },
        ],
      };

      const event = mapBrainOutputToEvent(clarify, { seq: 1 });
      expect(event.type).toBe('ask');
    });

    it('should route plan to correct mapper', () => {
      const plan: BrainPlan = {
        type: 'plan',
        title: 'Test Plan',
        description: 'A test plan',
        steps: [
          {
            id: 's1',
            title: 'Step 1',
            description: 'First step',
          },
        ],
      };

      const event = mapBrainOutputToEvent(plan, { seq: 1 });
      expect(event.type).toBe('ask');
    });
  });
});
