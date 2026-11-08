/**
 * Research review types (additive since 0.5.0).
 * Inferred from the zod schemas in `schemas/research.ts`.
 */

export type {
  UserSuppliedInput,
  ResearchArtifactStatus,
  ResearchSource,
  ResearchReviewSource,
  ResearchFinding,
  ResearchAssumption,
  ResearchUnknown,
  ResearchArtifact,
  ResearchAcceptanceBinding,
  ResearchReviewAsk,
} from '../schemas/research.js';

export {
  LANDING_PAGE_URL_MAX,
  RESEARCH_ACCEPT_VERB,
  RESEARCH_SOURCE_KIND,
} from '../schemas/research.js';
