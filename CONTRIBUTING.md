# Contributing to CodePulse

Thank you for your interest in contributing! 🎉

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/codepulse.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature`

## Development Workflow

### Making Changes

1. Make your changes in a feature branch
2. Test your changes locally
3. Ensure code passes linting: `pnpm lint`
4. Commit with clear messages

### Commit Messages

Follow conventional commits:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `chore: maintenance task`
- `refactor: code restructuring`
- `test: add tests`

### Pull Requests

1. Push your branch to your fork
2. Open a PR against `main`
3. Describe your changes clearly
4. Link any related issues
5. Wait for review

## Code Style

- **TypeScript**: Use strict mode, prefer explicit types
- **Rust**: Follow `rustfmt` conventions
- **React**: Functional components with hooks
- **CSS**: Use Tailwind utility classes

## Testing

### Rust
```bash
cd apps/desktop/src-tauri
cargo test
```

### TypeScript
```bash
pnpm lint
pnpm tsc --noEmit
```

## Project Structure

- `apps/desktop` - Tauri desktop app
- `apps/web` - Next.js website
- `packages/core` - Shared types/constants
- `packages/telemetry` - Logging utilities
- `scripts/` - Build scripts
- `.github/workflows/` - CI/CD

## Adding Features

### Desktop Features

1. Add Rust logic in `apps/desktop/src-tauri/src/`
2. Expose via Tauri command
3. Call from React frontend
4. Update UI components

### Web Features

1. Add pages in `apps/web/src/app/`
2. Create API routes in `apps/web/src/app/api/`
3. Update components in `apps/web/src/components/`

## Reporting Issues

- Check existing issues first
- Provide clear reproduction steps
- Include environment details
- Add screenshots if relevant

## Questions?

Open a [discussion](https://github.com/username/codepulse/discussions) or ask in your PR.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
