# Contributing to CodePulse

## Development Setup

```bash
# 1. Clone & setup
git clone https://github.com/AdlarX9/code-pulse.git
cd code-pulse
./codepulse.sh setup

# 2. Launch desktop app
./codepulse.sh desktop

# 3. Launch web app (optional)
./codepulse.sh web
```

## Code Structure

- `apps/desktop/` - Tauri desktop app (React + Rust)
- `apps/web/` - Next.js web app
- `packages/` - Shared code
- `docs/` - Documentation

## Making Changes

1. **Desktop App**: Edit files in `apps/desktop/src/`
2. **Web App**: Edit files in `apps/web/src/`
3. **Shared Code**: Edit files in `packages/`

## Testing

```bash
# Test everything
./codepulse.sh test

# Or test individually
./codepulse.sh build         # Build test
```

## Pull Requests

- Use conventional commit messages
- Update documentation if needed
- Add tests for new features
- Ensure all tests pass

## Need Help?

- Check the [docs/](docs/) folder
- Open an [issue](https://github.com/AdlarX9/code-pulse/issues) for bugs
- Start a [discussion](https://github.com/AdlarX9/code-pulse/discussions) for questions
