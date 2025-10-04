# 🚀 Quick Start Guide

Get CodePulse up and running in minutes.

## Prerequisites

Install these before starting:

- **Node.js** 20+ ([download](https://nodejs.org/))
- **pnpm** 9+ (`npm install -g pnpm`)
- **Rust** 1.70+ ([rustup](https://rustup.rs/))
- **Tauri prerequisites** ([see docs](https://tauri.app/v1/guides/getting-started/prerequisites))

### Platform-Specific Prerequisites

**macOS:**
```bash
xcode-select --install
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

**Windows:**
- Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/username/codepulse.git
cd codepulse

# Install all dependencies
pnpm install

# Build shared packages
pnpm -w build
```

## 🖥️ Running Desktop App

```bash
# Option 1: Direct Tauri command
cd apps/desktop
pnpm tauri dev

# Option 2: From root
pnpm dev:desktop
```

The desktop app window should open automatically.

## 🌐 Running Web App

### 1. Setup Supabase (Required for download tracking)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor and run `../../supabase-migration.sql`
4. Copy your project URL and service role key

### 2. Configure Environment

```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DOWNLOAD_IP_SALT=random-secret-string-change-me
NEXT_ADMIN_USER=admin
NEXT_ADMIN_PASS=changeme
GITHUB_REPO=username/codepulse
```

### 3. Start Dev Server

```bash
# From apps/web
pnpm dev

# Or from root
pnpm dev:web
```

Visit http://localhost:3000

## 🎯 Run Both Apps

```bash
# From root
pnpm dev
```

This runs:
- Desktop app on Tauri window
- Web app on http://localhost:3000

## 🏗️ Building for Production

### Desktop App

```bash
cd apps/desktop
pnpm tauri build
```

Outputs:
- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/appimage/` and `deb/`

### Web App

```bash
cd apps/web
pnpm build
pnpm start
```

## 🧪 Testing

```bash
# TypeScript type checking
pnpm lint

# Rust tests
cd apps/desktop/src-tauri
cargo test

# Build everything to verify
pnpm build
```

## 📝 Next Steps

1. **Customize branding**: Update icons in `apps/desktop/src-tauri/icons/`
2. **Configure repo**: Change `username/codepulse` to your GitHub repo
3. **Setup secrets**: Add `TAURI_PRIVATE_KEY`, `VERCEL_TOKEN`, etc. to GitHub
4. **Create first release**: `pnpm release:tag v1.0.0`

## 🐛 Troubleshooting

### Desktop app won't start
- Verify Rust is installed: `rustc --version`
- Check Tauri prerequisites: `pnpm tauri info`
- Try cleaning: `cd apps/desktop/src-tauri && cargo clean`

### Web app errors
- Verify Node version: `node --version` (should be 20+)
- Check environment variables in `.env.local`
- Verify Supabase connection

### Build fails
- Clean all artifacts: `pnpm clean`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check disk space

### pnpm not found
```bash
npm install -g pnpm
```

## 📚 Learn More

- [README.md](README.md) - Full documentation
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guide
- [PRIVACY.md](PRIVACY.md) - Privacy policy
- [Tauri Docs](https://tauri.app/v1/guides/)
- [Next.js Docs](https://nextjs.org/docs)

## 💬 Get Help

- [GitHub Issues](https://github.com/username/codepulse/issues)
- [Discussions](https://github.com/username/codepulse/discussions)

---

**Ready to analyze some code?** 🚀
