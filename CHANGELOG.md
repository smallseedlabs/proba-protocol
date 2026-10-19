# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
