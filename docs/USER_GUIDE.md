# CodePulse - Complete User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Desktop Application](#desktop-application)
3. [Organizations & Teams](#organizations--teams)
4. [Projects & Scanning](#projects--scanning)
5. [Quality Policies](#quality-policies)
6. [Analytics Dashboard](#analytics-dashboard)
7. [GitHub Integration](#github-integration)
8. [Integrations (Slack)](#integrations-slack)
9. [Billing & Subscriptions](#billing--subscriptions)
10. [CI/CD Integration](#cicd-integration)
11. [Exporting Data](#exporting-data)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

#### Desktop Application (Mac/Windows/Linux)

1. Download the installer for your platform from [codepulse.dev/download](https://codepulse.dev/download)
2. Run the installer
3. Launch CodePulse

#### First Time Setup

1. **Welcome Screen**: Choose "Sign Up" or "Sign In"
2. **Create Account**: Enter your email and create a password
3. **Authentication**: Verify your email address
4. **Dashboard**: You're ready to start!

### Creating Your First Project

1. Click **"Add Project"** on the Projects page
2. Enter a project name
3. Select the directory to scan
4. Click **"Create"**
5. Wait for the initial scan to complete

---

## Desktop Application

### Navigation

The desktop app uses a sidebar navigation with the following sections:

#### Main Section
- **Projects**: View and manage all your projects
- **Organization**: Manage teams, policies, and settings
- **Analytics**: View detailed quality metrics and trends

#### Settings Section
- **Profile**: Update your personal information
- **Settings**: Configure app preferences

### Quick Scan

Use the **"Quick Scan"** button in the sidebar footer to:
- Quickly scan a directory without creating a project
- Get instant quality metrics
- Export results

---

## Organizations & Teams

### Creating an Organization

1. Navigate to **Organization** in the sidebar
2. Click **"New Organization"**
3. Enter organization name
4. Click **"Create"**

### Managing Team Members

#### Inviting Members

1. Go to **Organization** → **Team** tab
2. Click **"Invite Member"**
3. Enter email address
4. Select role:
   - **Owner**: Full control
   - **Admin**: Can manage settings and members
   - **Member**: Can view and scan projects
5. Click **"Send Invitation"**

#### Managing Roles

1. Find the member in the team list
2. Use the role dropdown to change their access level
3. Changes take effect immediately

#### Removing Members

1. Click the trash icon next to a member
2. Confirm the removal
3. They will lose access immediately

### Organization Settings

#### Switching Organizations

Use the dropdown in the Organization header to switch between your organizations.

---

## Projects & Scanning

### Project Management

#### Creating Projects

**Method 1: Manual Creation**
1. Click **"Add Project"**
2. Select folder containing your code
3. Name your project
4. Click **"Create"**

**Method 2: GitHub Import** (Coming soon)
- Connect GitHub
- Select repositories
- Auto-create projects

#### Scanning Projects

**Automatic Scans:**
- Triggered on project creation
- Can be scheduled (Pro plan+)

**Manual Scans:**
1. Open project details
2. Click **"Scan Now"**
3. Wait for completion
4. View updated metrics

#### Project Settings

Access via the settings icon on each project:

- **Scan Settings**: Configure what to include/exclude
- **Excluded Patterns**: Add glob patterns to skip
- **Language Filters**: Choose which languages to track
- **Delete Project**: Permanently remove the project

### Understanding Scan Results

#### Key Metrics

**Total Lines**
- Sum of all lines in scanned files
- Includes code, comments, and blank lines

**Code Lines**
- Actual executable code
- Excludes comments and blank lines

**Comment Lines**
- Documentation and comments
- Inline and block comments

**Comment Ratio**
- `(Comments / Code) × 100`
- Industry standard: 15-20%
- CodePulse recommendation: > 15%

**Bloat Ratio**
- `(Blank lines / Total lines) × 100`
- Measures unnecessary whitespace
- Recommendation: < 30%

**Core vs Info**
- **Core**: Essential code files
- **Info**: Configuration, tests, docs

#### Language Breakdown

View detailed statistics for each programming language:
- Files count
- Line distribution
- Comment ratio per language
- Percentage of codebase

---

## Quality Policies

### Overview

Quality policies enforce code quality standards across your organization or specific repositories.

### Creating a Policy

1. Navigate to **Organization** → **Policies** tab
2. Click **"Create Policy"**
3. Configure policy settings:

#### Policy Configuration

**Name**: Descriptive name (e.g., "Production Quality")

**Scope**:
- **Organization-wide**: Applies to all repositories
- **Repository-specific**: Applies to one repository

**Thresholds**:
- **Min Comment Ratio**: Minimum acceptable comment percentage
- **Max Bloat Ratio**: Maximum acceptable blank line percentage
- **Min Doc Coverage**: Minimum documentation coverage

**Enforcement**:
- **Enabled/Disabled**: Turn policy on or off
- **Block on Fail**: (Team plan+) Prevent PR merges when failing

### Policy Evaluation

Policies are evaluated:
- On every scan
- On pull requests (with GitHub App)
- In CI/CD pipelines

**Results**:
- ✅ **Passed**: All thresholds met
- ⚠️ **Warning**: Some thresholds not met (soft fail)
- ❌ **Failed**: Critical thresholds not met (blocks if configured)

### Plan Limits

| Plan       | Max Policies | PR Blocking |
|------------|--------------|-------------|
| Free       | 1            | No          |
| Pro        | 5            | Soft        |
| Team       | Unlimited    | Hard        |
| Enterprise | Unlimited    | Custom      |

---

## Analytics Dashboard

### Accessing Analytics

Click **"Analytics"** in the sidebar to view organization-wide metrics.

### Dashboard Features

#### Time Period Selection

Use the dropdown to select:
- Last 7 days
- Last 30 days
- Last 90 days
- Last year

#### KPI Cards

**Total Code Lines**
- Current code line count
- Growth percentage from previous period
- Indicates project scale

**Comment Ratio**
- Current commenting level
- Quality indicator
- Trend comparison

**Repositories**
- Active repository count
- Connected GitHub repos

**Policy Score**
- Overall policy compliance
- Pass/fail ratio

#### Charts & Visualizations

**Code Trends (Area Chart)**
- Code growth over time
- Comment growth
- Quality score evolution

**Language Distribution (Pie Chart)**
- Breakdown by programming language
- Percentage of each language
- File counts

**Quality Metrics (Bar Chart)**
- Comment ratio
- Bloat ratio
- Documentation coverage

**Policy Evaluations (Pie Chart)**
- Passed checks
- Failed checks
- Warnings

**Quality Timeline (Line Chart)**
- Quality score trends
- Historical performance

#### Language Breakdown Table

Detailed table showing:
- Language name
- File count
- Code lines
- Comment lines
- Comment ratio
- Status badge

---

## GitHub Integration

### Setting Up GitHub App

#### Prerequisites

1. GitHub account
2. Admin access to repositories
3. CodePulse organization (Pro plan+)

#### Installation Steps

1. Go to **Organization** → **Integrations** tab
2. Click **"Connect GitHub App"**
3. Authorize the CodePulse GitHub App
4. Select repositories to connect
5. Grant required permissions:
   - Read repository contents
   - Read/write checks
   - Read/write pull requests

### Features

#### Automated PR Checks

When you open a pull request:
1. CodePulse scans the changed code
2. Evaluates quality policies
3. Posts check status to PR
4. Shows pass/fail with details

**Status Indicators**:
- ✅ **Success**: All policies passed
- ⚠️ **Warning**: Some policies failed (soft)
- ❌ **Failure**: Blocking policies failed

#### Commit Status

View quality status directly on commits:
- Click the check icon
- See detailed metrics
- Compare to baseline

#### Webhook Events

CodePulse listens for:
- `pull_request` opened/updated
- `push` to default branch
- `check_suite` requested

---

## Integrations (Slack)

### Connecting Slack

1. Navigate to **Organization** → **Integrations**
2. Click **"Connect to Slack"**
3. Select your Slack workspace
4. Choose a channel for notifications
5. Authorize the integration

### Features

#### Weekly Digest

Sent every Monday morning:
- Summary of past week's activity
- Key metrics and trends
- Repository activity
- Policy evaluation results

**Example Digest**:
```
📊 Weekly Quality Digest - Acme Inc

Total Code: 45,230 lines (+5.2%)
Comment Ratio: 18.3% (+2.1%)

Top Repositories:
• backend: 45 commits, 12 PRs, 19.2% comments
• frontend: 32 commits, 8 PRs, 17.1% comments

Policy Results: 23 passed, 2 failed
```

#### Real-Time Alerts

Instant notifications for:
- **Policy Violations**: When code fails quality checks
- **Low Quality PRs**: PRs with poor metrics
- **Scan Failures**: When scans encounter errors

### Customization

- Choose notification channel
- Set quiet hours
- Configure alert thresholds
- Disable specific alert types

---

## Billing & Subscriptions

### Plans Overview

#### Free Plan

**Price**: $0/month
- 1 seat
- 3 projects
- 90-day scan history
- 3 repositories
- 1 policy
- Community support

#### Pro Plan

**Price**: $29/user/month
- 1-5 seats
- Unlimited projects
- 365-day scan history
- Unlimited repositories
- 5 policies
- Soft PR checks
- Weekly Slack digest
- Email support

#### Team Plan

**Price**: $99/month (10 users) + $10/additional user
- 10+ seats (scalable)
- Unlimited projects
- Infinite scan history
- Unlimited repositories
- Unlimited policies
- Hard PR blocking
- All integrations
- Priority support
- Slack support channel

#### Enterprise Plan

**Price**: Custom
- Unlimited seats
- Unlimited everything
- Custom policies
- Advanced rules engine
- SSO/SAML
- On-premise deployment
- Dedicated support
- SLA guarantee

### Managing Subscription

#### Upgrading

1. Go to **Organization** → **Billing** tab
2. Click **"Upgrade"** on desired plan
3. Enter payment information
4. Confirm subscription

#### Billing Portal

Access Stripe's customer portal to:
- Update payment method
- View invoices
- Download receipts
- Update billing information
- Cancel subscription

#### Downgrading

1. Go to **Organization** → **Billing**
2. Click **"Manage Subscription"**
3. Select lower plan
4. Confirm (takes effect at period end)

**Note**: Data is retained according to new plan limits.

---

## CI/CD Integration

### CI Agent

The CodePulse CI Agent is a standalone Rust binary that runs in your CI pipeline.

#### Installation

**GitHub Actions**:
```yaml
- name: CodePulse Scan
  run: |
    docker run --rm \
      -v ${{ github.workspace }}:/workspace \
      ghcr.io/codepulse/ci-agent:latest \
      --path /workspace \
      --out scan.json
```

**GitLab CI**:
```yaml
codepulse:
  image: ghcr.io/codepulse/ci-agent:latest
  script:
    - ci-agent --path . --out scan.json
```

**CircleCI**:
```yaml
- run:
    name: CodePulse Scan
    command: ci-agent --path . --out scan.json
```

#### Configuration

**Command Options**:
- `--path`: Directory to scan
- `--out`: Output file path
- `--head-sha`: Git commit SHA
- `--exclude`: Patterns to exclude
- `--pretty`: Pretty-print JSON

#### Uploading Results

```bash
curl -X POST https://api.codepulse.dev/api/ci/snapshots \
  -H "Authorization: Bearer $CODEPULSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d @scan.json
```

#### Policy Enforcement

The CI Agent can fail the build:
```yaml
- name: Check Quality
  run: |
    ci-agent --path . --out scan.json --enforce-policy
```

### Environment Variables

Set in your CI system:
- `CODEPULSE_TOKEN`: Organization API token
- `CODEPULSE_ORG_ID`: Organization ID
- `CODEPULSE_POLICY_ID`: Policy to enforce (optional)

---

## Exporting Data

### Export Formats

CodePulse supports multiple export formats:

#### CSV Export

**Use Cases**:
- Import into spreadsheets
- Data analysis
- Custom reporting

**Contents**:
- Scan metadata
- All metrics
- Language breakdown
- Trend data

**How to Export**:
1. Open project or analytics
2. Click **"Export"** button
3. Select **"CSV"**
4. Choose data range
5. Download file

#### JSON Export

**Use Cases**:
- API integrations
- Custom tools
- Automation

**Format**:
```json
{
  "project": {
    "id": "uuid",
    "name": "My Project"
  },
  "scans": [
    {
      "id": "uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "total": 15420,
      "code": 12340,
      "comment": 1850,
      "blank": 1230,
      "comment_ratio": 0.15
    }
  ]
}
```

#### PDF Report

**Use Cases**:
- Executive summaries
- Stakeholder reports
- Documentation

**Contents**:
- Executive summary
- Quality metrics table
- Language breakdown
- Visual charts
- Recommendations

**How to Generate**:
1. Navigate to Analytics
2. Click **"Export PDF"**
3. Wait for generation
4. Download report

#### XML Export

**Use Cases**:
- Legacy system integration
- Enterprise tools

---

## Best Practices

### Code Quality Standards

#### Comment Ratio

**Recommended**: 15-20%

**Too Low** (< 10%):
- Code is hard to understand
- Maintenance burden
- Knowledge silos

**Too High** (> 30%):
- Excessive comments
- May indicate complex code
- Consider refactoring

#### Bloat Ratio

**Recommended**: < 25%

**How to Improve**:
- Remove excessive blank lines
- Use consistent formatting
- Configure code formatter

#### Documentation

**Best Practices**:
- Document public APIs
- Explain complex logic
- Include usage examples
- Keep comments up-to-date

### Project Organization

#### Monorepo vs Multi-repo

**Monorepo**:
- Track as single project
- Organization-level metrics
- Unified quality standards

**Multi-repo**:
- One project per repository
- Individual tracking
- Repository-specific policies

#### Scan Frequency

**Recommended Schedule**:
- **Development**: Every commit
- **Staging**: Every PR
- **Production**: Weekly

### Policy Strategy

#### Start Conservative

1. Begin with **monitoring mode** (no blocking)
2. Gather baseline metrics
3. Set realistic thresholds
4. Gradually increase standards

#### Gradual Enforcement

1. **Week 1-2**: Soft warnings only
2. **Week 3-4**: Block obviously poor code
3. **Month 2+**: Full enforcement

#### Exceptions

Some code needs flexibility:
- Generated code
- Third-party code
- Legacy systems

**Solution**: Use repository-specific policies

---

## Troubleshooting

### Common Issues

#### Scan Fails

**Symptoms**:
- Scan never completes
- Error message appears

**Solutions**:
1. Check folder permissions
2. Verify folder isn't too large (>10GB)
3. Check for symbolic links
4. Review excluded patterns

#### Wrong Language Detection

**Symptoms**:
- Files counted as wrong language
- Missing languages

**Solutions**:
1. Check file extensions
2. Update language settings
3. Add language hints in project settings

#### GitHub App Not Working

**Symptoms**:
- No PR checks
- Missing status updates

**Solutions**:
1. Verify GitHub App installation
2. Check repository permissions
3. Ensure webhooks are active
4. Review webhook delivery logs

#### Slack Integration Silent

**Symptoms**:
- No digest messages
- Missing alerts

**Solutions**:
1. Verify Slack connection
2. Check channel permissions
3. Confirm bot is in channel
4. Review notification settings

### Performance Issues

#### Slow Scans

**Causes**:
- Large codebase (>100k files)
- Network latency
- Resource constraints

**Solutions**:
1. Exclude unnecessary directories
2. Use `.gitignore` patterns
3. Increase RAM allocation
4. Scan incrementally

#### High Memory Usage

**Solutions**:
1. Close other applications
2. Reduce scan scope
3. Scan in batches
4. Upgrade hardware

### Getting Help

#### Community Support

- GitHub Discussions
- Discord server
- Stack Overflow tag: `codepulse`

#### Paid Support

- **Pro**: Email support (48h response)
- **Team**: Priority email + Slack channel (24h)
- **Enterprise**: Dedicated support + SLA (4h)

#### Resources

- Documentation: [docs.codepulse.dev](https://docs.codepulse.dev)
- API Reference: [api.codepulse.dev/docs](https://api.codepulse.dev/docs)
- Blog: [blog.codepulse.dev](https://blog.codepulse.dev)
- Status: [status.codepulse.dev](https://status.codepulse.dev)

---

## Keyboard Shortcuts

### Desktop App

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + N` | New project |
| `Cmd/Ctrl + R` | Rescan current project |
| `Cmd/Ctrl + ,` | Open settings |
| `Cmd/Ctrl + Q` | Quit application |
| `Cmd/Ctrl + W` | Close window |
| `Cmd/Ctrl + E` | Export current view |
| `Cmd/Ctrl + F` | Search projects |
| `Cmd/Ctrl + 1-5` | Switch sidebar sections |

---

## Security & Privacy

### Data Privacy

**What CodePulse Scans**:
- File counts
- Line counts by language
- Comment ratios
- File extensions

**What CodePulse NEVER Sees**:
- Your source code
- File contents
- File names
- Directory structures
- Credentials

### CI Agent Privacy

The CI Agent is designed with privacy-first principles:
- Runs locally in your CI environment
- Only sends aggregated metrics
- No code transmission
- Open source (audit anytime)

### Data Storage

- Metrics stored encrypted at rest
- SSL/TLS for data in transit
- Regular backups
- GDPR compliant
- SOC 2 Type II (Enterprise)

### API Security

- JWT authentication
- API rate limiting
- Webhook signature verification
- RBAC access control

---

## Glossary

**Comment Ratio**: Percentage of comments relative to code lines

**Bloat Ratio**: Percentage of blank lines in total lines

**Core Code**: Essential application code (excluding tests, docs)

**Info Lines**: Non-core lines (comments, blank, configuration)

**Scan**: Analysis of codebase at a point in time

**Policy**: Set of quality rules and thresholds

**Organization**: Team workspace for collaboration

**Project**: Individual codebase being tracked

**Repository**: Git repository (when GitHub-connected)

**Integration**: Third-party connection (Slack, GitHub)

**Webhook**: Real-time notification endpoint

**CI Agent**: Command-line scanner for CI/CD

---

**Last Updated**: 2024
**Version**: 2.0
**Questions**: support@codepulse.dev
