# KPower

Windows UPS monitor rebuild — light dashboard UI, Tauri + React.

## Real USB HID telemetry

The app reads the **MGE USB UPS** (`VID_0463` / `PID_0001`) over HID. There is **no simulator** in the live path.

```bash
cd kpower-app
npm install
npm run dev:live
```

That starts:

1. `scripts/ups-hid-bridge.mjs` — polls feature report 1 and serves `http://127.0.0.1:3921/snapshot`
2. Vite UI — consumes that snapshot

Or run the pieces separately:

```bash
npm run hid    # terminal 1
npm run dev    # terminal 2
```

Live values match stock KPower Data tab (input/output V, frequency, battery single V, load, temperature, runtime).

## Tests

```bash
npm test
```

## Native Tauri (optional)

Requires Rust, VS C++ Build Tools, and WDAC allowlisting for Cargo when Application Control blocks build scripts.

```bash
npm run tauri dev
```

If Tauri IPC has no connected device, the UI falls back to the HID bridge — never synthetic data.
