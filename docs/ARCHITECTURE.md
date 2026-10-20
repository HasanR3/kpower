# Architecture

```
┌─────────────────────┐     HTTP loopback      ┌──────────────────────────┐
│  Browser / static   │ ◄────────────────────► │  ups-hid-bridge.mjs      │
│  UI :1420           │   /snapshot /command   │  127.0.0.1:3921          │
└─────────────────────┘   /notify/* /health    └────────────┬─────────────┘
                                                           │ node-hid
                                                           ▼
                                                ┌──────────────────────────┐
                                                │  MGE/Eaton USB UPS       │
                                                │  VID 0463 / PID 0001     │
                                                │  Megatec feature rpt 06  │
                                                └──────────────────────────┘
```

## Components

| Piece | Role |
|-------|------|
| `src/` React app | Ops console; polls bridge; stores settings in `localStorage` |
| `scripts/ups-hid-bridge.mjs` | Exclusive HID reader; control; mail/Telegram/webhook; SNMP/NUT probes |
| `scripts/telegram-bot.mjs` | Long-poll commands + power-event watcher (config in AppData) |
| `scripts/serve-ui.mjs` | Serves production `dist/` on `:1420` |
| `scripts/start-background.ps1` | Idempotent start of bridge + UI (scheduled task) |
| Optional Tauri shell | Desktop wrapper when Rust/WDAC allows |

## Trust boundaries

- Bridge is **localhost-only**. Do not expose `:3921` on the network without auth.
- Control is **opt-in** (UI flag + env). Destructive Megatec commands require confirmation in the UI.
- Notifications carry operator-configured secrets; never log tokens at info level.

## Data

- Live telemetry: HID feature report poll (~1s)
- History: in-app samples + optional import from stock KPower SQLite
- Alarms: device codes + threshold engine (`src/lib/alarmEngine.ts`)
