# CodePulse CI Agent

Privacy-first code scanner for CI/CD pipelines. Analyzes code locally and sends only aggregated metrics (no source code) to CodePulse API.

## Features

- 🔒 **Privacy-first**: Never sends source code, only aggregated statistics
- ⚡ **Fast**: Parallel file scanning using Rayon
- 🎯 **Accurate**: Detects 40+ programming languages
- 🐳 **Docker-ready**: Available as a container image
- 📊 **Core vs Info**: Separates core logic from documentation/config

## Installation

### From Source

```bash
cd ci-agent
cargo build --release
./target/release/ci-agent --help
```

### Using Docker

```bash
docker build -t codepulse-ci-agent .
docker run --rm -v $(pwd):/workspace codepulse-ci-agent --path /workspace --out /workspace/scan.json
```

## Usage

Basic scan:

```bash
ci-agent --path /path/to/repo --head-sha abc123 --out scan.json
```

With custom exclude patterns:

```bash
ci-agent \
  --path /path/to/repo \
  --head-sha $GITHUB_SHA \
  --exclude "node_modules/**,dist/**,.git/**" \
  --out scan.json
```

## CI/CD Integration

### GitHub Actions

```yaml
name: CodePulse Quality Check

on:
    pull_request:
        branches: [main]

jobs:
    quality-check:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4

            - name: Run CodePulse CI Agent
              run: |
                  docker run --rm \
                    -v ${{ github.workspace }}:/workspace \
                    ghcr.io/yourorg/codepulse-ci-agent:latest \
                    --path /workspace \
                    --head-sha ${{ github.sha }} \
                    --out /workspace/scan.json

            - name: Upload scan to CodePulse
              env:
                  CODEPULSE_TOKEN: ${{ secrets.CODEPULSE_TOKEN }}
                  CODEPULSE_ORG_ID: ${{ secrets.CODEPULSE_ORG_ID }}
              run: |
                  curl -X POST https://api.codepulse.dev/api/ci/snapshots \
                    -H "Authorization: Bearer $CODEPULSE_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d @scan.json \
                    --data-urlencode "org_id=$CODEPULSE_ORG_ID" \
                    --data-urlencode "repository=${{ github.repository }}" \
                    --data-urlencode "commit_sha=${{ github.sha }}" \
                    --data-urlencode "pull_request=${{ github.event.pull_request.number }}"
```

### GitLab CI

```yaml
codepulse:scan:
    image: ghcr.io/yourorg/codepulse-ci-agent:latest
    stage: test
    script:
        - ci-agent --path . --head-sha $CI_COMMIT_SHA --out scan.json
        - |
            curl -X POST https://api.codepulse.dev/api/ci/snapshots \
              -H "Authorization: Bearer $CODEPULSE_TOKEN" \
              -H "Content-Type: application/json" \
              -d @scan.json
    only:
        - merge_requests
```

### CircleCI

```yaml
version: 2.1

jobs:
    codepulse-scan:
        docker:
            - image: ghcr.io/yourorg/codepulse-ci-agent:latest
        steps:
            - checkout
            - run:
                  name: Scan repository
                  command: ci-agent --path . --head-sha $CIRCLE_SHA1 --out scan.json
            - run:
                  name: Upload to CodePulse
                  command: |
                      curl -X POST https://api.codepulse.dev/api/ci/snapshots \
                        -H "Authorization: Bearer $CODEPULSE_TOKEN" \
                        -H "Content-Type: application/json" \
                        -d @scan.json

workflows:
    version: 2
    scan:
        jobs:
            - codepulse-scan
```

## Output Format

The agent outputs JSON with aggregated metrics:

```json
{
	"totals": {
		"total": 15420,
		"code": 12340,
		"comment": 1850,
		"blank": 1230,
		"core_code_lines": 9500,
		"info_lines": 2840
	},
	"per_language": [
		{
			"language": "TypeScript",
			"files": 45,
			"total": 8500,
			"code": 7200,
			"comment": 950,
			"blank": 350
		}
	],
	"scanned_at": "1705512000",
	"head_sha": "abc123def456"
}
```

## Environment Variables

- `CODEPULSE_TOKEN`: API token for authentication (org-level)
- `CODEPULSE_ORG_ID`: Your organization ID
- `CODEPULSE_API_URL`: API base URL (default: https://api.codepulse.dev)

## Privacy

CodePulse CI Agent **never** sends:

- Source code
- File paths
- Function/class names
- Comments content

It **only** sends:

- Aggregated line counts by language
- Comment ratios
- Core vs info classification

## License

Same as CodePulse main project.
