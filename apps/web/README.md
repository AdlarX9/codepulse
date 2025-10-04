# CodePulse Web

Landing page, download tracking, and admin dashboard.

## Tech Stack

- **Next.js 14**: React framework (App Router)
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations
- **Recharts**: Charts (admin dashboard)
- **Supabase**: Database (download analytics)

## Development

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials

# Run dev server
pnpm dev
```

Visit http://localhost:3000

## Environment Variables

```env
# Required
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
DOWNLOAD_IP_SALT=random-long-string

# Admin dashboard
NEXT_ADMIN_USER=admin
NEXT_ADMIN_PASS=changeme

# Optional (for GitHub asset resolution)
GITHUB_TOKEN=ghp_xxx
GITHUB_REPO=username/codepulse
```

## Pages

- `/` - Landing page with animated hero
- `/privacy` - Privacy policy
- `/admin` - Admin dashboard (Basic Auth)

## API Routes

- `/api/download` - Download tracking + redirect
- `/api/admin/stats` - Get download statistics (protected)

## Database Setup

1. Create a Supabase project
2. Run the migration in `../../supabase-migration.sql`
3. Copy your service role key to `.env.local`

## Building

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Deployment

### Vercel (Recommended)

1. Import project to Vercel
2. Set environment variables
3. Deploy

Or use Vercel CLI:
```bash
vercel --prod
```

### Other Platforms

Build the Next.js app:
```bash
pnpm build
```

Then deploy the `.next` directory with a Node.js runtime.

## Admin Dashboard

Access at `/admin` with credentials from `NEXT_ADMIN_USER` and `NEXT_ADMIN_PASS`.

Features:
- Download statistics over time
- Platform breakdown (pie chart)
- Top countries (bar chart)
- Version distribution
- CSV export

## Privacy

Download tracking collects:
- Hashed IP (SHA-256 + salt)
- Geographic region (from CDN)
- Platform, version, user agent, referrer

**No raw IPs or personal data are stored.**

See [PRIVACY.md](../../PRIVACY.md) for full details.
