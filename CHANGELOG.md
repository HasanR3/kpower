# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-20

### Added

- React/Vite monitoring console (Overview, Device, Alarms, Schedule, Control, History, Settings)
- Live MGE/Eaton USB HID bridge (`127.0.0.1:3921`) with Megatec control path
- Live / stale / disconnected / bridge-down communications honesty
- Alarm engine with configurable thresholds
- SMTP, Telegram, and webhook notification delivery via bridge
- Telegram bot commands and power-fail / restore / extended-outage alerts
- Windows scheduled task for always-on HID + static UI (`KPowerMonitor`)
- Inno Setup all-in-one installer packaging (bundled Node runtime)
- Playwright smoke tests and Vitest unit suite
- Stock `kpower.db` history import helper
- SNMP / NUT probe endpoints (secondary to HID)

### Security

- Control writes require Settings **Allow control** and `ALLOW_HID_CONTROL=1`
- Bridge listens on loopback only
- Telegram credentials stored outside the git tree

### Known limitations

- Host OS shutdown actions are not fully automated yet
- Native Tauri MSI build may fail under enterprise WDAC
- Installer EXE is unsigned (Smart App Control may block until signed)

[0.1.0]: https://github.com/HasanR3/kpower/commits/main
