# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## What this project is

KPower is a **local** Windows UPS monitoring stack:

- HID bridge binds to **`127.0.0.1:3921` only** (not the LAN)
- Web UI is served on **`127.0.0.1:1420`** (packaged) or Vite dev server
- UPS **control writes are disabled by default** (Settings + `ALLOW_HID_CONTROL=1`)

Credentials (SMTP, Telegram bot token / chat id, webhooks) are stored only in:

- Browser `localStorage` (settings)
- `%LOCALAPPDATA%\KPowerMonitor\telegram.json` (bridge bot config)

They must **never** be committed. `telegram.json` and `.env*` are gitignored.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security-sensitive reports.

1. Open a private [GitHub Security Advisory](https://github.com/HasanR3/kpower/security/advisories/new) on this repository, or  
2. Contact the repository owner via GitHub.

Include: affected version/commit, reproduction steps, and impact (e.g. local privilege, credential exposure, unsafe control unlock).

We aim to acknowledge within 7 days and ship a fix or mitigation for confirmed issues.

## Hardening checklist (operators)

- [ ] Keep stock KPower closed while this bridge holds USB HID
- [ ] Leave **Allow control** off unless you intentionally need Megatec writes
- [ ] Do not change the bridge bind address to `0.0.0.0` without auth / firewall
- [ ] Rotate Telegram bot tokens if they ever appeared in a log or screenshot
- [ ] Code-sign Windows installers for Smart App Control / enterprise WDAC environments

## Known product limitations (not vulnerabilities)

- Host OS auto-shutdown policy is configured in Settings but **not fully executed** yet
- SNMP / NUT are probe helpers, not primary production monitors (HID is primary)
- Unsigned Inno Setup builds may be blocked by Smart App Control until signed
