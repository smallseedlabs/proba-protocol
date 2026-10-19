# Contributing to proba-protocol

Thank you for your interest in contributing to the Proba Protocol library!

## License

By contributing to this project, you agree that your contributions will be licensed under the Apache License 2.0.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/smallseedlabs/proba-protocol.git
   cd proba-protocol
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit source files in `src/`
   - Add or update tests in `tests/`
   - Update documentation as needed

3. **Run validations**
   ```bash
   npm run validate
   ```
   This runs linting, type checking, and tests.

4. **Commit your changes**
   We use [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: add new command type"
   git commit -m "fix: correct validation for ask payload"
   git commit -m "docs: update README with new examples"
   ```

   **Commit types:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `test:` Test updates
   - `refactor:` Code refactoring
   - `chore:` Maintenance tasks
   - `ci:` CI/CD changes

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Pull Request Guidelines

- **Title**: Use conventional commit format
- **Description**: 
  - Explain the motivation
  - List key changes
  - Reference related issues
  - Note any breaking changes
- **Tests**: Include tests for new functionality
- **Documentation**: Update README or add JSDoc comments

## Code Standards

### TypeScript

- Use strict TypeScript with no `any` types
- Export types from `types/` directory
- Document complex types with JSDoc

### Testing

- Write unit tests for all schemas
- Test both valid and invalid cases
- Aim for >80% code coverage
- Use descriptive test names

### Documentation

- Add JSDoc comments to public APIs
- Update README for user-facing changes
- Include examples for new features

## Project Structure

```
proba-protocol/
├── src/
│   ├── types/          # TypeScript type definitions
│   ├── schemas/        # Zod schemas for validation
│   ├── builders/       # Helper functions to build envelopes
│   ├── utils/          # Utility functions and type guards
│   ├── mapping/        # Brain output to protocol mapping
│   └── index.ts        # Main export file
├── tests/
│   ├── schemas/        # Schema validation tests
│   ├── builders/       # Builder function tests
│   ├── utils/          # Utility tests
│   ├── mapping/        # Mapping tests
│   └── examples/       # Fixture validation tests
├── examples/           # Example conversations
└── scripts/            # Build scripts
```

## Adding New Features

### New Command Type

1. Add type to `src/types/command.ts`
2. Add payload interface
3. Create Zod schema in `src/schemas/command.ts`
4. Update `validateCommandPayload` function
5. Add builder in `src/builders/command.ts`
6. Add tests
7. Update documentation

### New Event Type

1. Add type to `src/types/event.ts`
2. Add payload interface
3. Create Zod schema in `src/schemas/event.ts`
4. Update `validateEventPayload` function
5. Add builder in `src/builders/event.ts`
6. Add tests
7. Update documentation

### New UI Component

1. Add component type to `src/types/ui.ts`
2. Define props interface
3. Add schema in `src/schemas/ui.ts`
4. Update documentation with usage example

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Test Categories

- **Schema tests**: Validate Zod schemas with valid/invalid inputs
- **Builder tests**: Verify builder functions create correct envelopes
- **Utility tests**: Test type guards and helpers
- **Mapping tests**: Validate brain output conversions
- **Fixture tests**: Ensure examples remain valid

## Release Process

Releases are handled by maintainers:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create and push a git tag: `v0.1.0`
4. GitHub Actions will build and publish to GitHub Packages

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Reach out to maintainers for guidance

Thank you for contributing! 🎉
