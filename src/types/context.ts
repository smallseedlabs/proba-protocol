/**
 * Context bridge types (additive since 0.4.0).
 * Inferred from the zod schemas in `schemas/context.ts`.
 */

export type {
  StepType,
  ItemTrust,
  SectionKind,
  KnownGapCode,
  ContextNeed,
  ContextItem,
  ContextSection,
  ContextGap,
  ContextManifest,
  ContextRequest,
  ContextPacket,
  ActAsAssertionClaims,
  ContextAuditDetails,
  BrainContextAttachedDetails,
} from '../schemas/context.js';

export { KNOWN_GAP_CODES, ACT_AS_ASSERTION_MAX_TTL_SECONDS } from '../schemas/context.js';
