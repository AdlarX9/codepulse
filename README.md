# CodePulse

> Beautiful, privacy-first code analysis tool for developers

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/release/username/codepulse.svg)](https://github.com/username/codepulse/releases)

CodePulse is a cross-platform desktop application that analyzes your codebase and provides detailed statistics, visualizations, and insights—all while keeping your code completely private and offline.

## ✨ Features

- 🚀 **Lightning Fast**: Rust-powered backend scans thousands of files in seconds
- 🔒 **Privacy First**: All analysis happens locally—your code never leaves your machine
- 📊 **Rich Insights**: Detailed stats, interactive charts, and breakdowns by language
- 🎨 **Beautiful UI**: Modern interface with dark mode support
- 💾 **Export**: Save results as CSV or JSON
- 🌍 **Cross-Platform**: Works on macOS, Windows, and Linux

## 🚀 Quick Start

**New to CodePulse?** Check out the [Getting Started Guide](docs/GETTING_STARTED.md) for a step-by-step walkthrough.

```bash
# Clone and install
git clone https://github.com/AdlarX9/code-pulse.git
cd code-pulse
pnpm install

# Generate icons
python3 scripts/create-dev-icons.py

# Launch desktop app
bash scripts/launch-desktop.sh

# Or launch web app
bash scripts/launch-web.sh
```

## 📥 Download

Download the latest version for your platform:

- [macOS (DMG)](https://codepulse.app/api/download?platform=mac)
- [Windows (MSI)](https://codepulse.app/api/download?platform=win)
- [Linux (AppImage)](https://codepulse.app/api/download?platform=linux)

## 🏗️ Architecture

This is a monorepo containing:

```
codepulse/
├── apps/
│   ├── desktop/          # Tauri + React + TypeScript desktop app
│   └── web/             # Next.js landing page + admin dashboard
├── packages/
│   ├── core/            # Shared types, constants, schemas
│   └── telemetry/       # Logging utilities
├── scripts/             # Build and release scripts
└── .github/workflows/   # CI/CD pipelines
```

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DOWNLOAD_IP_SALT=random-salt-for-hashing
NEXT_ADMIN_PASS=secure-password
GITHUB_TOKEN=ghp_token_for_releases
GITHUB_REPO=username/codepulse
NEXT_PUBLIC_SITE_URL=https://codepulse.app
```

## 🔐 Privacy

CodePulse takes privacy seriously:

- ✅ All code analysis happens **locally** on your machine
- ✅ No network requests from the desktop app
- ✅ No telemetry or crash reporting
- ✅ Download analytics are **anonymous** (hashed IPs + geographic region only)
- ✅ Open source—audit the code yourself

See [PRIVACY.md](docs/PRIVACY.md) for details.

## 🧪 Testing

```bash
# Run Rust tests
cd apps/desktop/src-tauri
cargo test

# Run TypeScript checks
pnpm -w lint
```

## 📝 Scripts

- `pnpm dev` - Run all apps in development mode
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Run linting
- `pnpm clean` - Clean build artifacts
- `pnpm release:tag <version>` - Create release tag

See `scripts/` directory for utility scripts.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with amazing open source tools:

- [Tauri](https://tauri.app/)
- [Rust](https://www.rust-lang.org/)
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- And many more!

## 📧 Support

- 🐛 [Report a bug](https://github.com/username/codepulse/issues)
- 💡 [Request a feature](https://github.com/username/codepulse/issues)
- 💬 [Discussions](https://github.com/username/codepulse/discussions)

---

Made with ❤️ for developers who care about privacy.
