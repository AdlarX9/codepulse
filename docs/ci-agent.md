# CI Agent (Essentiel)

Scanner Rust autonome pour CI/CD. Analyse locale, envoie uniquement des métriques agrégées (aucun code source).

## Installation

```bash
# Depuis la source
cd ci-agent
cargo build --release
./target/release/ci-agent --help

# Docker
docker build -t codepulse-ci-agent .
docker run --rm -v $(pwd):/workspace codepulse-ci-agent \
  --path /workspace \
  --out /workspace/scan.json
```

## Usage minimal

```bash
# Scan basique
ci-agent --path /path/to/repo --out scan.json

# Exclure des patterns
ci-agent --path . \
  --exclude "node_modules/**,dist/**,.git/**" \
  --out scan.json
```

### Options utiles

- `--path` : Dossier à analyser
- `--out` : Fichier de sortie JSON
- `--head-sha` : Commit SHA (CI)
- `--exclude` : Glob d’exclusion (séparés par des virgules)
- `--pretty` : JSON lisible

## GitHub Actions (exemple)

```yaml
name: CodePulse Scan
on:
    pull_request:
    push:
        branches: [main]
jobs:
    scan:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - name: Run CI Agent (Docker)
              run: |
                  docker run --rm \
                    -v ${{ github.workspace }}:/workspace \
                    ghcr.io/codepulse/ci-agent:latest \
                    --path /workspace \
                    --head-sha ${{ github.sha }} \
                    --out /tmp/scan.json
            - name: Upload to CodePulse API
              env:
                  CODEPULSE_TOKEN: ${{ secrets.CODEPULSE_TOKEN }}
                  CODEPULSE_ORG_ID: ${{ secrets.CODEPULSE_ORG_ID }}
              run: |
                  curl -X POST https://api.codepulse.dev/api/ci/snapshots \
                    -H "Authorization: Bearer $CODEPULSE_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d @/tmp/scan.json \
                    --data-urlencode "org_id=$CODEPULSE_ORG_ID" \
                    --data-urlencode "repository=${{ github.repository }}" \
                    --data-urlencode "commit_sha=${{ github.sha }}"
```

## Variables d’environnement

- `CODEPULSE_TOKEN` : Jeton d’API (niveau organisation)
- `CODEPULSE_ORG_ID` : UUID d’organisation
- `CODEPULSE_API_URL` : Base URL API (défaut: `https://api.codepulse.dev`)

## Format de sortie (résumé)

```json
{
	"totals": { "total": 15420, "code": 12340, "comment": 1850, "blank": 1230 },
	"per_language": [{ "language": "TypeScript", "files": 45, "code": 7200 }],
	"scanned_at": "1705512000",
	"head_sha": "abc123def456"
}
```

## Confidentialité

- Jamais envoyé : code source, chemins de fichiers, contenu des commentaires
- Envoyé : métriques agrégées (lignes, ratios, répartition par langage)
