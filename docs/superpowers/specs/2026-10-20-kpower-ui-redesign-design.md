# KPower UI redesign — design spec

**Date:** 2026-10-20  
**Status:** Draft for review  
**Product:** KPower — UPS monitor / control (Windows)

## 1. Intent

Rebuild KPower as a modern Windows desktop app with **full feature parity** to stock KPower (v1.0.x), a **light metrics dashboard** visual language, and engineering **best practices** (typed boundaries, safe commands, durable persistence, graceful failure).

Stock KPower is a closed-source Qt Quick app at `C:\Program Files (x86)\KPower`. This project is a clean-room replacement UI + services that speak the same USB HID UPS class where reverse-engineered, not a patch of the vendor binary.

### Success criteria

- User can see live UPS status at a glance on a light dashboard.
- User can manage alarms, schedules, control commands, history, and settings.
- Safe-shutdown automation works on battery/low-runtime thresholds with cancelable countdown.
- App runs from tray; survives disconnect/reconnect without crashing.
- Installer is self-contained Windows build (Tauri).

### Non-goals (v1)

- macOS / Linux (Windows only).
- Patching or redistributing vendor `KPower.exe` / `kpowerd.exe`.
- Cloud sync or multi-UPS fleet management.
- Pixel-perfect clone of the vendor UI.

## 2. Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Shell | Tauri 2 (Windows) | Lean native shell, tray, notifications, OS shutdown hooks |
| UI | React + TypeScript + Vite | Fast light-dashboard UI; matches style direction C (light) |
| Charts | Lightweight chart lib (e.g. uPlot or Recharts) | 60s voltage series without heavy dashboards kit |
| Core | Rust | HID I/O, poller, command queue, SQLite, shutdown policy |
| DB | SQLite (app data dir) | History, schedules, settings |
| HID | `hidapi` (Rust) | Same device class stock KPower uses (USB HID) |

## 3. Architecture

```
React UI  --invoke/events-->  Rust core  --HID-->  UPS
                |                  |
                |                  +-- SQLite (history, schedules, settings)
                |                  +-- Windows shutdown / tray / notify
                +-- single store subscription for UpsSnapshot
```

**Rules**

- UI never opens HID or talks raw protocol.
- Rust owns device session, normalization, persistence, and OS integration.
- One writer for HID; commands are serialized through a queue.
- Fail closed on unknown/malformed HID responses; log and continue polling.

## 4. Screens

Chrome: light dashboard, top status bar (connection · UPS mode · estimated runtime), primary nav for six areas, system tray icon.

| Screen | Purpose |
|--------|---------|
| Device | Home: metric tiles (load, battery %, Vin/Vout, frequency, temperature), ~60s voltage chart, compact power-flow mimic, connection state |
| Alarms | Active + recent alarms; severity; acknowledge/clear when protocol supports |
| Schedule | CRUD timed actions (shutdown, self-test, etc.) |
| Control | Self-test, buzzer, power on/off — confirm before destructive sends |
| History | Metrics/events by date range; export CSV in v1 (XLSX optional later) |
| Settings | Poll interval, USB first, shutdown thresholds, tray/start-with-Windows, language |

**Empty / error**

- No device: clear “UPS not connected” + reconnect action.
- Command failure: name the command, show reason, offer retry.
- Permission / HID busy: actionable message (close stock KPower, replug, etc.).

## 5. Visual direction

- **Style:** Light dashboard (approved variant of direction C).
- **Palette (tokens):** cool white / light gray surfaces; soft blue accent; semantic green/amber/red for status; high-contrast text.
- **Typography:** One geometric sans for UI + numerals; clear type scale; sentence case; no ALL-CAPS eyebrows as decoration.
- **Layout:** Metric tiles + chart on Device; avoid card soup — tiles only where they group interactive or scannable metrics.
- **Motion:** Minimal; respect `prefers-reduced-motion`.
- Avoid: purple gradients, dark-default chrome, glow effects, terracotta/cream “AI default” looks.

## 6. Data model (logical)

### `UpsSnapshot` (event to UI)

- `connected: bool`
- `mode` (e.g. line / battery / bypass / fault — enum as protocol reveals)
- `loadPercent`, `batteryPercent`, `runtimeSeconds`
- `inputVoltage`, `outputVoltage`, `frequency`, `temperatureC`
- `alarmCodes: string[]` / structured alarms
- `timestamp`

### Persistence

- `settings` — key/value or typed row
- `alarms_log` — time, code, severity, acked
- `metrics_samples` — downsampled history for History view
- `schedules` — cron-like or datetime + action + enabled
- `events` — shutdown countdowns, command results

## 7. Data flow & reliability

1. **Poller** (configurable interval, default ~1s) reads HID → parses → emits `UpsSnapshot`.
2. **UI** subscribes; chart keeps a ring buffer (~60 points).
3. **Commands:** UI `invoke` → validate → enqueue → HID write → result. Destructive actions require explicit confirm.
4. **Schedules:** Rust timer checks due rows → enqueue same command path.
5. **Safe shutdown:** policy watches battery/runtime → notify → countdown (cancelable) → Windows shutdown API.
6. **Coexistence:** If stock KPower holds the HID device, show conflict guidance; do not fight silently.

## 8. Protocol strategy

Stock protocol is not publicly documented in full. Approach:

1. Inventory USB VID/PID and HID report descriptors from the connected UPS / stock app behavior.
2. Capture/compare reports during known UI actions (status poll, self-test, buzzer) using read-only observation where possible.
3. Implement an adapter trait `UpsProtocol` with a first concrete driver; keep parsing isolated from UI and OS layers.
4. Feature-flag commands until verified on hardware.
5. Document unknowns in an `unknowns.md` appendix as they are found; do not invent packet layouts without evidence.

**Risk:** Full parity depends on successful HID reverse-engineering. UI and persistence can proceed behind a **simulator backend** so screens ship before every command is proven.

## 9. Best practices (non-negotiable)

- TypeScript strict + Rust `deny` warnings as errors in CI locally.
- Explicit error types across the FFI boundary (no bare strings as sole contract).
- Atomic settings writes; migrations for SQLite schema.
- Structured logging; no secrets in repo; `.gitignore` for local captures.
- Least privilege: request elevation only if shutdown/HID truly requires it; document why.
- Accessibility: keyboard focus, contrast, labeled controls.
- Testing — see §10.

## 10. Testing

| Layer | What |
|-------|------|
| Unit | Protocol parse/serialize fixtures; shutdown policy thresholds; schedule due logic |
| Integration | Simulated HID device feeding poller → events → store |
| UI | Component tests for empty/error/connected Device states; confirm dialogs on Control |
| Manual | Real UPS: connect, disconnect, alarm, self-test, scheduled action, shutdown countdown cancel |

Simulator is required for day-to-day UI work without hardware.

## 11. Delivery phases

1. **Scaffold** — Tauri + React light shell, tray, nav, Device layout with simulator data.
2. **HID discovery** — enumerate device, read reports, map `UpsSnapshot` fields with evidence.
3. **Alarms + History + Settings** — persistence wired.
4. **Control + Schedule** — verified commands behind flags.
5. **Safe shutdown** — policy + countdown + OS integration.
6. **Parity polish** — remaining stock features, export, installer.

## 12. Open decisions (resolved in this brief)

| Topic | Decision |
|-------|----------|
| Platform | Windows only |
| Parity | Full (phased delivery) |
| Visual | Light dashboard |
| Stack | Tauri + React + Rust |
| Speed vs lean | Lean (Tauri) preferred over Electron |

## 13. Out of scope reminders

Do not modify files under `C:\Program Files (x86)\KPower` as the product. New app lives in this workspace and installs to its own directory.
