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

### Tech Stack

**Desktop App:**
- [Tauri](https://tauri.app/) - Desktop framework
- [Rust](https://www.rust-lang.org/) - Fast, safe backend
- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Recharts](https://recharts.org/) - Data visualization

**Web:**
- [Next.js 14](https://nextjs.org/) - React framework
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Supabase](https://supabase.com/) - Download analytics
- [Vercel](https://vercel.com/) - Hosting

## 🚀 Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust 1.70+
- Platform-specific Tauri dependencies ([see docs](https://tauri.app/v1/guides/getting-started/prerequisites))

### Setup

```bash
# Clone the repository
git clone https://github.com/username/codepulse.git
cd codepulse

# Install dependencies
pnpm install

# Build shared packages
pnpm -w build
```

### Running Locally

**Desktop App:**
```bash
pnpm dev:desktop
```

**Web App:**
```bash
# Configure environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Supabase credentials

pnpm dev:web
```

**Both Simultaneously:**
```bash
pnpm dev
```

### Building

```bash
# Build everything
pnpm build

# Build specific app
pnpm build:web
pnpm build:desktop
```

## 📦 Release

Releases are automated via GitHub Actions:

```bash
# Create and push a version tag
pnpm release:tag v1.0.0
```

This triggers:
1. Multi-platform Tauri builds (macOS, Windows, Linux)
2. GitHub Release creation with artifacts
3. assets.json manifest update
4. Automatic web deployment

## 🗄️ Database Setup (Web)

The web app uses Supabase for download analytics. Run the migration:

```sql
-- See supabase-migration.sql
```

Configure environment variables in `apps/web/.env.local`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DOWNLOAD_IP_SALT=random-salt-for-hashing
NEXT_ADMIN_USER=admin
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
