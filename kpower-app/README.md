# KPower (Phase 1)

Windows UPS monitor rebuild — light dashboard UI, Tauri + React.

## Spec / plan

- Spec: `../docs/superpowers/specs/2026-10-20-kpower-ui-redesign-design.md`
- Plan: `../docs/superpowers/plans/2026-10-20-kpower-foundation.md`

## Run UI (browser / Vite)

Application Control on this machine may block `cargo` build scripts, so Phase 1 UI can run without the native shell:

```bash
cd kpower-app
npm install
npm run dev
```

Open the printed localhost URL. A TypeScript simulator feeds live `UpsSnapshot` data once per second when Tauri IPC is unavailable.

```bash
npm test
```

## Run native (when Cargo works)

Requires Rust, Visual Studio C++ Build Tools, and Application Control allowlisting for Cargo build scripts under your cargo target directory.

```bash
npm run tauri dev
```

## Phase 1 scope

- Device dashboard (tiles, voltage chart, power-flow mimic)
- Nav stubs: Alarms, Schedule, Control, History, Settings
- Simulator backend (TS always; Rust when compilable)
- Tray Show/Quit (native only)

Not yet: real USB HID, schedules, control commands, safe-shutdown, SQLite history.
