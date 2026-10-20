# KPower app

See the [repository README](../README.md) for screenshots, quick start, background service, and packaging.

## Dev

```powershell
npm install
npm run hid    # terminal 1 — http://127.0.0.1:3921
npm run dev    # terminal 2 — http://127.0.0.1:1420
```

## Screenshots

Saved under [`screenshots/`](screenshots/). Refresh with:

```powershell
npm run service:start   # or npm run hid + npm run dev
node scripts/capture-screenshots.mjs
```
