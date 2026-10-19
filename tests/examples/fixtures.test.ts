/**
 * Tests that validate the example fixtures.
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  commandEnvelopeSchema,
  eventEnvelopeSchema,
  validateCommandPayload,
  validateEventPayload,
} from '../../src/schemas/index.js';
import { isCommandEnvelope, isEventEnvelope } from '../../src/utils/guards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConversationStep {
  step: number;
  description: string;
  command?: unknown;
  response?: unknown;
  event?: unknown;
}

interface ConversationFixture {
  description: string;
  conversation: ConversationStep[];
}

describe('Example Fixtures', () => {
  let fixture: ConversationFixture;

  beforeAll(() => {
    const fixturePath = join(__dirname, '../../examples/happy-path-conversation.json');
    const fixtureContent = readFileSync(fixturePath, 'utf-8');
    fixture = JSON.parse(fixtureContent) as ConversationFixture;
  });

  it('should load the happy-path conversation fixture', () => {
    expect(fixture).toBeDefined();
    expect(fixture.description).toBeDefined();
    expect(fixture.conversation).toBeInstanceOf(Array);
    expect(fixture.conversation.length).toBeGreaterThan(0);
  });

  it('should have valid command envelopes for all commands', () => {
    const steps = fixture.conversation.filter((step) => step.command);
    expect(steps.length).toBeGreaterThan(0);

    steps.forEach((step) => {
      const cmd = step.command;
      expect(isCommandEnvelope(cmd)).toBe(true);
      
      const result = commandEnvelopeSchema.safeParse(cmd);
      if (!result.success) {
        console.error(`Step ${step.step} command validation failed:`, result.error);
      }
      expect(result.success).toBe(true);
    });
  });

  it('should have valid event envelopes for all events', () => {
    const steps = fixture.conversation.filter((step) => step.event);
    expect(steps.length).toBeGreaterThan(0);

    steps.forEach((step) => {
      const evt = step.event;
      expect(isEventEnvelope(evt)).toBe(true);
      
      const result = eventEnvelopeSchema.safeParse(evt);
      if (!result.success) {
        console.error(`Step ${step.step} event validation failed:`, result.error);
      }
      expect(result.success).toBe(true);
    });
  });

  it('should have valid response envelopes', () => {
    const steps = fixture.conversation.filter((step) => step.response);
    
    steps.forEach((step) => {
      const resp = step.response;
      expect(isEventEnvelope(resp)).toBe(true);
      
      const result = eventEnvelopeSchema.safeParse(resp);
      if (!result.success) {
        console.error(`Step ${step.step} response validation failed:`, result.error);
      }
      expect(result.success).toBe(true);
    });
  });

  it('should have valid payload schemas for all commands', () => {
    const steps = fixture.conversation.filter((step) => step.command);
    
    steps.forEach((step) => {
      if (!isCommandEnvelope(step.command)) return;
      
      const { type, payload } = step.command;
      const isValid = validateCommandPayload(type, payload);
      
      if (!isValid) {
        console.error(`Step ${step.step} command payload validation failed for type ${type}`);
      }
      expect(isValid).toBe(true);
    });
  });

  it('should have valid payload schemas for all events', () => {
    const allEvents = [
      ...fixture.conversation.filter((step) => step.event).map((s) => s.event),
      ...fixture.conversation.filter((step) => step.response).map((s) => s.response),
    ];
    
    allEvents.forEach((evt) => {
      if (!isEventEnvelope(evt)) return;
      
      const { type, payload } = evt;
      const isValid = validateEventPayload(type, payload);
      
      if (!isValid) {
        console.error(`Event payload validation failed for type ${type}`);
      }
      expect(isValid).toBe(true);
    });
  });

  it('should have increasing sequence numbers for events', () => {
    const events = fixture.conversation
      .filter((step) => step.event || step.response)
      .map((step) => step.event ?? step.response);
    
    let lastSeq = -1;
    events.forEach((evt) => {
      if (!isEventEnvelope(evt)) return;
      
      expect(evt.seq).toBeGreaterThan(lastSeq);
      lastSeq = evt.seq;
    });
  });

  it('should have consistent threadId across conversation', () => {
    const threadIds = new Set<string>();
    
    fixture.conversation.forEach((step) => {
      const item = step.command ?? step.event ?? step.response;
      if (!item || typeof item !== 'object' || !('threadId' in item)) return;
      
      if (item.threadId) {
        threadIds.add(item.threadId as string);
      }
    });
    
    expect(threadIds.size).toBe(1);
  });

  it('should demonstrate all key command types', () => {
    const commandTypes = new Set(
      fixture.conversation
        .filter((step) => step.command && isCommandEnvelope(step.command))
        .map((step) => (step.command as { type: string }).type)
    );
    
    expect(commandTypes.has('create_goal')).toBe(true);
    expect(commandTypes.has('answer_ask')).toBe(true);
    expect(commandTypes.has('approve_plan')).toBe(true);
  });

  it('should demonstrate all key event types', () => {
    const eventTypes = new Set(
      fixture.conversation
        .filter((step) => (step.event || step.response) && 
                isEventEnvelope(step.event ?? step.response))
        .map((step) => {
          const evt = (step.event ?? step.response) as { type: string };
          return evt.type;
        })
    );
    
    expect(eventTypes.has('ack')).toBe(true);
    expect(eventTypes.has('ask')).toBe(true);
    expect(eventTypes.has('status')).toBe(true);
    expect(eventTypes.has('message')).toBe(true);
    expect(eventTypes.has('goal_updated')).toBe(true);
  });

  it('should have UI components for appropriate events', () => {
    const eventsWithUI = fixture.conversation
      .filter((step) => step.event)
      .map((step) => step.event)
      .filter((evt): evt is { ui?: unknown } => 
        typeof evt === 'object' && evt !== null && 'ui' in evt && evt.ui !== undefined
      );
    
    expect(eventsWithUI.length).toBeGreaterThan(0);
    
    eventsWithUI.forEach((evt) => {
      expect(evt.ui).toHaveProperty('component');
      expect(evt.ui).toHaveProperty('version');
      expect(evt.ui).toHaveProperty('props');
    });
  });

  it('should demonstrate the edit workflow (approve -> edit)', () => {
    const editStep = fixture.conversation.find(
      (step) =>
        step.command &&
        isCommandEnvelope(step.command) &&
        step.command.type === 'answer_ask' &&
        step.command.payload &&
        typeof step.command.payload === 'object' &&
        'choice' in step.command.payload &&
        step.command.payload.choice === 'edit'
    );
    
    expect(editStep).toBeDefined();
    expect(editStep?.description).toContain('edit');
  });
});
