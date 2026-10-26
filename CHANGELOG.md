# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-10-25

### Added

- `campaign.*` action domain (additive; no category, schema or JSON Schema change): `campaign.created`, `campaign.launched`, `campaign.paused`, `campaign.resumed`, `campaign.stopped`, `campaign.budget_changed`, `campaign.synced`, `campaign.sync_failed`, `campaign.metrics_attributed`
  - Lifecycle actions map to category `command` (`campaign.launched` is high risk, pause/resume/stop medium), `campaign.budget_changed` to `policy` (high risk), the sync and attribution actions to `metrics`
  - Listed in `AUDIT_ACTIONS.campaign` and described in `AUDIT_ACTION_INFO`; README catalog updated

## [0.3.0] - 2026-10-25

### Added

- Complete audit action catalog, additive and backwards compatible (every action published in 0.2.0 is still listed and valid; the `AuditEvent` schema, its action regex and the JSON Schema bundle are unchanged):
  - New domains and actions: `thread.*` (`created`, `message_received`, `access_denied`), `goal.*` (`created`, `updated`, `status_changed`, `clarification_answered`, `budget_proposed`, `budget_approved`, `budget_declined`), `budget.*` (`evaluated`, `limit_reached`), `control.*` (`paused`, `resumed`, `emergency_stopped`, `killed`), `stream.*` (`connected`, `disconnected`)
  - New actions in existing domains: `brain.reply_generated`, `brain.explanation_generated`, `brain.clarification_requested`, `tool.proposed`, `tool.executed`, `auth.session_expired`, `data_access.delete`, `memory.ingested`, `memory.promoted`, `memory.consolidated`, `memory.decayed`, `memory.retrieved`, `metrics.ingested`, `metrics.restated`, `metrics.rollup_run`, `system.job_failed`
  - `AUDIT_ACTION_INFO`: recommended `category`, default `riskLevel`, `status` (`specific` / `generic` / `alias`), `preferred` replacements and a description per action
  - `isKnownAuditAction` and `getAuditActionInfo` helpers; `AuditActionName`, `AuditActionDomain`, `AuditActionInfo` and `AuditActionStatus` types
  - README: catalog table and a generic-to-specific mapping

### Changed

- `AUDIT_ACTIONS` is grouped by domain instead of by category. The 11 category names are still keys with all their old entries, so `AUDIT_ACTIONS[category]` keeps working; new keys (`thread`, `goal`, `budget`, `control`, `stream`) are domains whose actions map to an existing category (see `AUDIT_ACTION_INFO`). Code that assumes the keys of `AUDIT_ACTIONS` are exactly the categories (for example `keyof typeof AUDIT_ACTIONS` used as a category type) must switch to `AuditCategory`
- Generic actions stay valid but are documented as such, with preferred replacements: `data_access.read` / `data_access.write`, `policy.evaluated`, `policy.denied`, `config.changed`, `tool.called`, `memory.read` / `memory.write`. Aliases: `brain.clarify_requested`, `tool.completed`, `metrics.observation_stored`
- `AuditCategory` is intentionally unchanged: new domains reuse the existing categories, because stores index on the category enum

### Fixed

- `package.json` version (the `v0.2.0` tag still said 0.1.2, and `package-lock.json` said 0.1.0) is now 0.3.0

## [0.2.0] - 2026-10-25

This section was `[Unreleased]` when `v0.2.0` was tagged.

### Added

- `AuditEvent` (version 1) and `StoredAuditEvent` schemas and types for the global audit trail
- `MetricObservation` (version 1) schema and types for normalised ad-platform metrics
- `buildAuditEvent`, `validateAuditEvent`, `validateStoredAuditEvent`, `isAuditEvent`, `validateMetricObservation` and `isMetricObservation` helpers
- `canonicalizeAuditEvent` (stable key order) for consumers that hash audit events
- `AUDIT_ACTIONS` recommended action names per category
- `@smallseedlabs/proba-protocol/audit` subpath export; everything is also exported from the package root
- `AuditEvent`, `StoredAuditEvent` and `MetricObservation` in the JSON Schema bundle
- Optional `MetricObservation.timezone` (IANA zone name, validated with `Intl.DateTimeFormat`): the ad account's reporting timezone, which defines what a `day` period means
- `spanIdSchema`, `SPAN_ID_PATTERN` and `isValidTimeZone` exports

### Changed (within this unreleased contract)

- `AuditEvent.spanId` and `parentSpanId` are strict OpenTelemetry-style ids: exactly 16 lowercase hex characters, not all zeros. `generateSpanId` never returns all zeros
- Documented: `traceId` stays a UUID (remove the dashes for the 32-hex OpenTelemetry trace id); `campaignId` is a free string; `revision` starts at 0; timestamps are UTC ISO 8601 with trailing `Z`; suggested default `workspaceId` is `seedbed`

## [0.1.2] - 2024-10-19

### Fixed

- Add `prepare` script to build dist/ automatically on git URL installs
- Fixes TypeScript type resolution when installing via `github:smallseedlabs/proba-protocol#v0.1.2`

## [0.1.1] - 2024-10-19

### Changed

- License changed from MIT to Apache License 2.0
- Publish workflow now supports both tag push and manual release workflows

## [0.1.0] - 2024-10-19

### Added

- Initial release of proba-protocol
- TypeScript type definitions for all protocol entities
- Zod schemas with runtime validation for commands and events
- JSON Schema export for non-TypeScript clients
- Command builders with automatic idempotency key generation
- Event builders for server-side event creation
- Brain output to protocol event mapping functions
- Type guard utilities for runtime type checking
- Server-driven UI component specifications (17 component types)
- Transport contract documentation (REST POST, SSE, polling fallback)
- Command types: send_message, answer_ask, create_goal, approve_plan, control, explain, mark_read
- Event types: message, ask, ask_resolved, status, alert, goal_updated, ack, error
- Comprehensive test suite with >80% coverage
- Happy-path conversation example with 10-step flow
- Complete documentation with sequence diagrams
- GitHub Actions CI for lint, typecheck, test, and build
- Conventional Commits standard
- MIT License

[0.1.0]: https://github.com/smallseedlabs/proba-protocol/releases/tag/v0.1.0
