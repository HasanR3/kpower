# KPower packaging & background monitoring

## Daily run (monitoring)

```powershell
cd C:\Users\Hasan\Downloads\Kpower\kpower-app
# Close stock KPower first (exclusive USB HID)
npm run hid
# other terminal:
npm run dev
```

Open http://localhost:1420

## Background HID bridge (Windows)

```powershell
cd C:\Users\Hasan\Downloads\Kpower\kpower-app
npm run service:install
```

Removes with `npm run service:uninstall`.

## Control unlock (dangerous)

```powershell
npm run hid:control
```

Plus Settings → **Allow control**.

## Tauri desktop build

Requires Rust toolchain + WebView2. WDAC/corporate policy may block `cargo`.

```powershell
npm run tauri:build
```

Installer output under `src-tauri/target/release/bundle/`.

## Stock history import

With bridge running: Settings → Monitoring → **Import stock history**  
(or `npm run history:inspect`).

## E2E

```powershell
npm run test:e2e
```
