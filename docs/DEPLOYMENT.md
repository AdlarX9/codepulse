# 🚀 Deployment Guide

Complete guide for deploying CodePulse to production.

## 📋 Checklist Before First Release

- [ ] Update branding (app name, icons, colors)
- [ ] Configure GitHub repository
- [ ] Setup Supabase database
- [ ] Setup Vercel project (web)
- [ ] Configure secrets in GitHub
- [ ] Test build locally
- [ ] Update README with correct URLs

## 🗄️ Database Setup (Supabase)

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for database to provision

### 2. Run Migration

1. Go to SQL Editor in Supabase dashboard
2. Open `supabase-migration.sql` from the repo
3. Paste and execute

This creates:

- `downloads` table
- Indexes for performance
- Row Level Security policies

### 3. Get Credentials

- **Project URL**: Settings → API → Project URL
- **Service Role Key**: Settings → API → service_role (secret)

⚠️ **Important**: Never commit the service role key to git!

## 🌐 Web Deployment (Vercel)

### Option 1: Vercel Git Integration (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure build settings:
    - **Framework**: Next.js
    - **Root Directory**: `apps/web`
    - **Build Command**: `pnpm build`
    - **Output Directory**: `.next`

4. Add environment variables:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DOWNLOAD_IP_SALT=random-secret-32-chars-minimum
NEXT_ADMIN_USER=admin
NEXT_ADMIN_PASS=strong-password-here
GITHUB_TOKEN=ghp_your_token
GITHUB_REPO=username/codepulse
```

5. Deploy!

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from apps/web
cd apps/web
vercel --prod
```

## 🖥️ Desktop App Release

Releases are automated via GitHub Actions when you push a tag.

### 1. Setup GitHub Secrets

Go to repository Settings → Secrets → Actions and add:

**Optional (for signing):**

- `TAURI_PRIVATE_KEY` - For app signing/updates
- `TAURI_KEY_PASSWORD` - Password for private key
- `APPLE_CERTIFICATE` - macOS code signing (Base64)
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

**For web deploy (if not using Vercel Git):**

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### 2. Create Release

```bash
# Ensure you're on main branch
git checkout main
git pull

# Create and push version tag
pnpm release:tag v1.0.0
```

This triggers the `release.yml` workflow which:

1. Builds for macOS, Windows, Linux (parallel)
2. Creates GitHub Release
3. Uploads installers (.dmg, .msi, .AppImage, .deb)
4. Generates checksums
5. Updates `assets.json` manifest

### 3. Verify Release

1. Go to GitHub Releases
2. Verify all artifacts are uploaded:
    - `CodePulse_x.x.x_x64.dmg`
    - `CodePulse_x.x.x_x64_en-US.msi`
    - `codepulse_x.x.x_amd64.AppImage`
    - `codepulse_x.x.x_amd64.deb`
    - `checksums.txt`
3. Download and test on target platforms

## 🔑 Code Signing (Production)

### macOS

1. Get Apple Developer account
2. Create certificates in Xcode
3. Export as Base64:
    ```bash
    base64 -i certificate.p12 | pbcopy
    ```
4. Add to GitHub secrets

Update `tauri.conf.json`:

```json
{
	"tauri": {
		"bundle": {
			"macOS": {
				"signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
			}
		}
	}
}
```

### Windows

1. Get code signing certificate
2. Add thumbprint to `tauri.conf.json`:

```json
{
	"tauri": {
		"bundle": {
			"windows": {
				"certificateThumbprint": "YOUR_THUMBPRINT",
				"digestAlgorithm": "sha256"
			}
		}
	}
}
```

## 📊 Monitoring

### Download Analytics

Access admin dashboard at:

```
https://your-domain.com/admin
```

Credentials: `NEXT_ADMIN_USER` / `NEXT_ADMIN_PASS`

### Supabase Dashboard

Monitor database at:

```
https://app.supabase.com/project/YOUR_PROJECT/editor
```

## 🔄 Updates

### Patch Release (v1.0.1)

```bash
# Update version in files
# - package.json (root)
# - apps/desktop/package.json
# - apps/desktop/src-tauri/Cargo.toml
# - apps/desktop/src-tauri/tauri.conf.json

git add .
git commit -m "chore: bump version to v1.0.1"
git push

pnpm release:tag v1.0.1
```

### Major Release (v2.0.0)

Same as patch, but increment major version.

## 🛡️ Security Best Practices

1. **Never commit secrets**: Use `.env.local` and `.gitignore`
2. **Rotate keys regularly**: Especially `DOWNLOAD_IP_SALT`
3. **Strong admin password**: Use password manager
4. **Enable 2FA**: On GitHub, Vercel, Supabase
5. **Review RLS policies**: In Supabase

## 🔍 Troubleshooting

### Release workflow fails

Check GitHub Actions logs:

1. Go to Actions tab
2. Click failed workflow
3. Expand failed job
4. Check error messages

Common issues:

- Missing secrets
- Rust compilation errors
- Network timeouts

### Assets not updating

1. Verify `assets.json` was updated
2. Check GitHub API rate limits
3. Clear CDN cache (Vercel)

### Supabase connection errors

1. Verify credentials in environment
2. Check RLS policies
3. Test with Supabase SQL editor

## 📈 Performance

### Web Optimization

- Enable Vercel Analytics
- Use Vercel Speed Insights
- Monitor Core Web Vitals

### Desktop Optimization

- Profile with `cargo flamegraph`
- Reduce bundle size with `strip = true`
- Test on low-end hardware

## 📝 Post-Deployment

1. Test download links on all platforms
2. Verify admin dashboard access
3. Check analytics are recording
4. Update social media/website
5. Write release notes
6. Announce to users

## 🆘 Rollback

If a release has critical issues:

1. Delete GitHub release
2. Delete tag:
    ```bash
    git tag -d v1.0.0
    git push --delete origin v1.0.0
    ```
3. Fix issues
4. Release new version

---

**Questions?** Open an [issue](https://github.com/username/codepulse/issues).
