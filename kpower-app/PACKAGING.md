# Packaging & background monitoring

## Daily run

```powershell
cd kpower-app
# Close stock KPower first (exclusive USB HID)
npm run hid
# other terminal:
npm run dev
```

Open http://127.0.0.1:1420

## Background HID + web UI

Keeps both always on:

- HID bridge → `http://127.0.0.1:3921/`
- Web UI → `http://127.0.0.1:1420/`

```powershell
cd kpower-app
npm run service:install
```

Starts at logon and re-checks every 5 minutes. Manual start: `npm run service:start`.  
Remove: `npm run service:uninstall`.

## Control unlock (dangerous)

```powershell
npm run hid:control
```

Plus Settings → **Allow control**.

## Windows installer (all-in-one)

Produces `release\KPower-Setup-0.1.0.exe` with UI + HID bridge + portable Node.js.

```powershell
cd kpower-app
npm run installer:build
```

### Smart App Control / WDAC

Unsigned Setup.exe may be blocked on locked-down PCs. Options:

1. Temporarily turn Smart App Control off, run Setup, or  
2. Authenticode-sign the Setup with a trusted certificate, or  
3. SAC-safe install (same payload, no Setup.exe):

```powershell
npm run installer:prepare
powershell -ExecutionPolicy Bypass -File .\scripts\Install-KPower.ps1
```

Native Tauri MSI (`npm run tauri:build`) requires Rust + WebView2 and may fail when Application Control blocks Cargo build scripts.

## Stock history import

With bridge running: Settings → Monitoring → **Import stock history**  
(or `npm run history:inspect`).

## E2E

```powershell
npm run test:e2e
```
