# Icons

To generate icons, you need a 1024x1024 PNG source image.

## Generate icons automatically:

```bash
# From apps/desktop directory
pnpm tauri icon path/to/your/icon.png
```

This will generate all required icon sizes for macOS, Windows, and Linux.

## Manual icon sizes needed:

- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)

## Temporary workaround:

If you don't have an icon yet, you can use a placeholder or disable icon validation temporarily in tauri.conf.json.
