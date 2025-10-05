# CodePulse Desktop

Cross-platform desktop application for code analysis.

## Tech Stack

- **Tauri**: Desktop framework
- **Rust**: Backend scanner
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Recharts**: Charts

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Or use Tauri CLI directly
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Architecture

### Frontend (`src/`)

- `App.tsx` - Main application component
- `components/` - UI components
- `lib/` - Utilities

### Backend (`src-tauri/src/`)

- `main.rs` - Tauri app entry point
- `scanner/` - Code scanning logic
    - `mod.rs` - Main scanner
    - `language.rs` - Language detection
    - `counter.rs` - Line counting logic

## Building

### Debug Build

```bash
pnpm tauri build --debug
```

### Release Build

```bash
pnpm tauri build
```

Outputs:

- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/appimage/`

## Testing

```bash
# Rust tests
cd src-tauri
cargo test

# TypeScript checks
pnpm tsc --noEmit
```

## Code Signing (Production)

### macOS

Set environment variables:

```bash
export APPLE_CERTIFICATE=<base64>
export APPLE_CERTIFICATE_PASSWORD=<password>
export APPLE_ID=<apple-id>
export APPLE_PASSWORD=<app-specific-password>
export APPLE_TEAM_ID=<team-id>
```

### Windows

Set in tauri.conf.json:

```json
{
	"tauri": {
		"bundle": {
			"windows": {
				"certificateThumbprint": "...",
				"digestAlgorithm": "sha256"
			}
		}
	}
}
```

## Privacy

The desktop app:

- ✅ Runs completely offline
- ✅ Makes zero network requests
- ✅ Stores nothing outside the scanned directory
- ✅ Has read-only file access

## Performance

The Rust backend can scan:

- 10,000 files in ~2-3 seconds
- 100,000 files in ~20-30 seconds

(Actual performance varies by hardware and file size)
