# KPower Foundation (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Windows Tauri + React app with light-dashboard chrome, six-route nav, live Device view driven by a Rust simulator emitting `UpsSnapshot` events.

**Architecture:** React UI never touches HID. Rust owns a `UpsBackend` trait with a `SimulatorBackend` implementation that polls on an interval and emits typed events to the frontend. Real HID arrives in a later plan behind the same trait.

**Tech Stack:** Tauri 2, React 18+, TypeScript (strict), Vite, Rust edition 2021, serde JSON events.

**Spec:** `docs/superpowers/specs/2026-10-20-kpower-ui-redesign-design.md`

**Follow-up plans (not this document):** Phase 2 HID adapter; Phase 3 alarms/history/settings persistence; Phase 4 control/schedule; Phase 5 safe-shutdown; Phase 6 installer polish.

## Global Constraints

- Platform: Windows only (Tauri Windows target).
- Visual: light dashboard — cool white/gray surfaces, soft blue accent, semantic green/amber/red; no dark-default chrome, no purple gradients, no glow.
- UI never opens HID or speaks raw protocol.
- TypeScript strict; Rust warnings denied in library crates we own.
- App data (future SQLite) lives under the OS app-data dir, never under Program Files.
- Do not modify `C:\Program Files (x86)\KPower`.
- Prefer simulator for all Phase 1 UI work.

## Review Focus

- Disconnect mid-session: UI must show disconnected state, not freeze on last metrics — covered in Task 5.
- Malformed/partial snapshot JSON: frontend ignores bad events and keeps last good state — covered in Task 4.
- Rapid reconnect: new snapshots resume without duplicate nav remounts — covered in Task 5.
- `prefers-reduced-motion: reduce`: chart/status transitions do not animate — covered in Task 3.
- Destructive Control actions are out of scope for Phase 1 but nav stubs must not invoke real commands — covered in Task 3.

## File structure

```
kpower-app/                          # new app root in workspace
  package.json
  src/
    main.tsx
    App.tsx
    styles/tokens.css                # color/type/spacing tokens
    styles/app.css
    lib/types.ts                     # UpsSnapshot, UpsMode, shared with Rust serde names
    lib/upsStore.ts                  # subscribe to Tauri events
    components/StatusBar.tsx
    components/AppNav.tsx
    components/MetricTile.tsx
    components/VoltageChart.tsx
    components/PowerFlowMimic.tsx
    pages/DevicePage.tsx
    pages/AlarmsPage.tsx             # stub empty state
    pages/SchedulePage.tsx           # stub
    pages/ControlPage.tsx            # stub (no invoke)
    pages/HistoryPage.tsx            # stub
    pages/SettingsPage.tsx           # stub
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/main.rs
    src/lib.rs
    src/model.rs                     # UpsSnapshot, UpsMode
    src/backend/mod.rs
    src/backend/traits.rs            # UpsBackend
    src/backend/simulator.rs
    src/poller.rs
    tests/simulator_poll.rs
```

---

### Task 1: Scaffold Tauri + React + TypeScript

**Files:**
- Create: `kpower-app/` via `npm create tauri-app` (React + TS + Vite template), then align names below
- Create: `kpower-app/src/styles/tokens.css`
- Modify: `kpower-app/src-tauri/tauri.conf.json` (productName `KPower`, windows subtitle)
- Test: `kpower-app/package.json` scripts `dev` / `build` exist

**Interfaces:**
- Consumes: none
- Produces: runnable `npm run tauri dev` shell with blank React root

- [ ] **Step 1: Initialize git in workspace if missing** (needed for later commits)

```bash
cd C:\Users\Hasan\Downloads\Kpower
git init
```

- [ ] **Step 2: Scaffold app**

Use Tauri 2 official scaffold with React + TypeScript + Vite. Project directory name: `kpower-app`.

- [ ] **Step 3: Add light design tokens in `src/styles/tokens.css`**

CSS variables exactly:

- `--bg: #f4f6f8`
- `--surface: #ffffff`
- `--text: #1a2332`
- `--muted: #5c6b7a`
- `--accent: #2f6fed`
- `--ok: #1f9d55`
- `--warn: #c47d0e`
- `--danger: #d92d20`
- `--border: #d8dee6`
- `--font: "Segoe UI", "IBM Plex Sans", system-ui, sans-serif`

- [ ] **Step 4: Verify dev shell starts**

Run: `cd kpower-app && npm run tauri dev`  
Expected: window opens; stop after confirm (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add kpower-app docs
git commit -m "chore: scaffold KPower Tauri React app with light tokens"
```

---

### Task 2: Shared `UpsSnapshot` model (Rust + TS)

**Files:**
- Create: `kpower-app/src-tauri/src/model.rs`
- Modify: `kpower-app/src-tauri/src/lib.rs` (mod model)
- Create: `kpower-app/src/lib/types.ts`
- Test: `kpower-app/src-tauri/tests/model_json.rs`

**Interfaces:**
- Consumes: none
- Produces:
  - Rust: `pub enum UpsMode { Line, Battery, Bypass, Fault, Unknown }`
  - Rust: `pub struct UpsSnapshot { pub connected: bool, pub mode: UpsMode, pub load_percent: f32, pub battery_percent: f32, pub runtime_seconds: u32, pub input_voltage: f32, pub output_voltage: f32, pub frequency: f32, pub temperature_c: f32, pub alarm_codes: Vec<String>, pub timestamp_ms: u64 }`
  - Serde: `rename_all = "camelCase"` on structs/enums so JSON matches TS
  - TS: mirrored `UpsMode` union and `UpsSnapshot` interface with camelCase fields

- [ ] **Step 1: Write failing Rust test `snapshot_serializes_camel_case`**

Assert JSON for a sample snapshot contains `"batteryPercent"` and `"mode":"battery"` (serde enum lowercase via `rename_all = "camelCase"` + `#[serde(rename_all = "camelCase")]` on enum or explicit renames).

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd kpower-app/src-tauri && cargo test snapshot_serializes_camel_case -- --nocapture`  
Expected: FAIL (module/type missing)

- [ ] **Step 3: Implement `model.rs` + wire `mod model`**

- [ ] **Step 4: Run test — expect PASS**

Run: `cargo test snapshot_serializes_camel_case`  
Expected: PASS

- [ ] **Step 5: Add matching `src/lib/types.ts`**

- [ ] **Step 6: Commit**

```bash
git add kpower-app/src-tauri/src/model.rs kpower-app/src-tauri/tests/model_json.rs kpower-app/src/lib/types.ts kpower-app/src-tauri/src/lib.rs
git commit -m "feat: add shared UpsSnapshot model across Rust and TS"
```

---

### Task 3: App chrome — StatusBar, Nav, route stubs, tokens applied

**Files:**
- Create: components and pages listed in File structure (stubs for non-Device pages)
- Modify: `App.tsx`, `main.tsx`, `styles/app.css`
- Test: `kpower-app/src/components/StatusBar.test.tsx` (Vitest)

**Interfaces:**
- Consumes: `UpsSnapshot | null` for StatusBar
- Produces: routes `device | alarms | schedule | control | history | settings`; Control stub must not call `invoke`

- [ ] **Step 1: Add Vitest + React Testing Library; write failing test `StatusBar shows Disconnected when snapshot null`**

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd kpower-app && npm test -- StatusBar`  
Expected: FAIL

- [ ] **Step 3: Implement StatusBar, AppNav, stub pages, App shell using tokens**

StatusBar copy when disconnected: `Disconnected`. When connected: show mode label + `runtime` as `Mm Ss` from `runtimeSeconds`.

Respect reduced motion: in `app.css`, under `@media (prefers-reduced-motion: reduce)` set `transition: none` and `animation: none` on chart/status elements.

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add light app chrome, nav, and page stubs"
```

---

### Task 4: Simulator backend + poller + Tauri event `ups://snapshot`

**Files:**
- Create: `src-tauri/src/backend/traits.rs`, `simulator.rs`, `mod.rs`, `poller.rs`
- Modify: `lib.rs` / `main.rs` to spawn poller on setup
- Test: `src-tauri/tests/simulator_poll.rs`

**Interfaces:**
- Consumes: `UpsSnapshot` from Task 2
- Produces:
  - `pub trait UpsBackend: Send { fn read_snapshot(&mut self) -> UpsSnapshot; }`
  - `SimulatorBackend::new(seed: u64) -> Self` — connected=true, mode cycles or stays Line, voltages near 230±noise, battery 100 decreasing slowly optional
  - `pub fn spawn_poller(app: AppHandle, backend: impl UpsBackend + 'static, interval: Duration)`
  - Event name exactly: `ups://snapshot` with payload `UpsSnapshot`
  - Command `get_latest_snapshot() -> Option<UpsSnapshot>` for initial paint

- [ ] **Step 1: Write failing test `simulator_read_snapshot_is_connected`**

Assert `SimulatorBackend::new(1).read_snapshot().connected == true` and `input_voltage` in `200.0..260.0`.

- [ ] **Step 2: Run — expect FAIL**

Run: `cargo test simulator_read_snapshot_is_connected`  
Expected: FAIL

- [ ] **Step 3: Implement trait, simulator, poller, register event + command**

Default interval: `Duration::from_secs(1)`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add UPS simulator backend and snapshot poller events"
```

---

### Task 5: Frontend store + Device page (tiles, chart, mimic)

**Files:**
- Create: `src/lib/upsStore.ts`, `MetricTile.tsx`, `VoltageChart.tsx`, `PowerFlowMimic.tsx`, `DevicePage.tsx`
- Modify: `App.tsx` to pass store into Device
- Test: `src/lib/upsStore.test.ts`, `src/pages/DevicePage.test.tsx`

**Interfaces:**
- Consumes: event `ups://snapshot`, command `get_latest_snapshot`
- Produces:
  - `subscribeUps(cb: (s: UpsSnapshot | null) => void): () => void`
  - `parseSnapshot(raw: unknown): UpsSnapshot | null` — returns null on invalid shape (keeps last good in store)
  - DevicePage renders tiles for load, battery, Vin, Vout, freq, temp; chart of last ≤60 Vin/Vout points; mimic reflects `mode`

- [ ] **Step 1: Write failing tests**

- `parseSnapshot_rejects_garbage` → `null`
- `DevicePage_shows_reconnect_cta_when_disconnected` — snapshot `{ connected: false, ...defaults }` shows text `UPS not connected`

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- upsStore DevicePage`  
Expected: FAIL

- [ ] **Step 3: Implement store, Device widgets, wire App**

Chart: keep ring buffer length 60 in the store or DevicePage; use a lightweight chart library already chosen at implement time (uPlot or Recharts).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Manual check**

Run: `npm run tauri dev`  
Expected: Device tiles update about once per second; toggling simulator disconnect (add temporary command `simulator_set_connected(bool)` if needed for manual test) updates StatusBar and empty state.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: Device dashboard driven by live simulator snapshots"
```

---

### Task 6: Tray icon stub + Phase 1 README

**Files:**
- Modify: `src-tauri` tray setup (Show / Quit)
- Create: `kpower-app/README.md` — how to run, Phase 1 scope, pointer to spec/plan
- Test: manual — tray menu works on Windows

**Interfaces:**
- Consumes: Tauri tray API
- Produces: tray with `Show` (focus main window) and `Quit`

- [ ] **Step 1: Implement tray menu Show / Quit**

- [ ] **Step 2: Manual verify on Windows**

- [ ] **Step 3: Write README**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add system tray stub and Phase 1 README"
```

---

## Spec coverage (Phase 1)

| Spec item | Task |
|-----------|------|
| Tauri + React light shell | 1, 3 |
| `UpsSnapshot` events | 2, 4, 5 |
| Device home tiles/chart/mimic | 5 |
| Nav to six areas | 3 |
| Simulator backend | 4 |
| Tray | 6 |
| HID / control / schedules / shutdown / SQLite | deferred to later plans |

## Self-review notes

- Proportion kept to Phase 1 only; full parity would balloon this plan.
- Event name and camelCase serde locked for cross-task consistency.
- Review Focus items mapped to Tasks 3–5.
