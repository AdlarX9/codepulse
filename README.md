# CodePulse

> Beautiful, privacy-first code analysis tool for developers

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/release/username/codepulse.svg)](https://github.com/username/codepulse/releases)

CodePulse is a cross-platform desktop application that analyzes your codebase and provides detailed statistics, visualizations, and insights—all while keeping your code completely private and offline.

_Before you go any further, check out our detailed documentation [here](docs/README.md)._

## ✨ Features

- 🚀 **Lightning Fast**: Rust-powered backend scans thousands of files in seconds
- 🔒 **Privacy First**: All analysis happens locally—your code never leaves your machine
- 📊 **Rich Insights**: Detailed stats, interactive charts, and breakdowns by language
- 💾 **Export**: Save results as CSV or JSON
- 🌍 **Cross-Platform**: Works on macOS, Windows, and Linux

## 🚀 Quick Start

**New to CodePulse?** Check out the [Getting Started Guide](docs/QUICKSTART.md) for a step-by-step walkthrough.

```bash
# Clone and setup
git clone https://github.com/AdlarX9/code-pulse.git
cd code-pulse
./codepulse.sh setup

# Launch desktop app
./codepulse.sh desktop

# Or launch web app
./codepulse.sh web
```

## 🔐 Privacy

CodePulse takes privacy seriously:

- ✅ All code analysis happens **locally** on your machine
- ✅ No network requests from the desktop app
- ✅ No telemetry or crash reporting
- ✅ Download analytics are **anonymous** (hashed IPs + geographic region only)
- ✅ Open source—audit the code yourself

## 🏗️ Architecture

CodePulse uses a modern architecture:

- **Desktop App** (Tauri + Rust): Local code analysis engine
- **Web Dashboard** (Next.js + React): User interface and project management
- **PostgreSQL Database**: Data persistence for projects, scans, and analytics
- **GitHub Integration**: Repository linking for enhanced insights

## 🙏 Acknowledgments

Built with amazing open source tools:

- [Tauri](https://tauri.app/)
- [Rust](https://www.rust-lang.org/)
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- And many more!

---

Made with ❤️ for developers who care about privacy.
