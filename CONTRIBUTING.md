# Contributing

Thanks for helping improve KPower.

## Development setup (Windows)

```powershell
git clone https://github.com/HasanR3/kpower.git
cd kpower/kpower-app
npm install
# Close stock KPower (exclusive USB)
npm run hid    # terminal 1
npm run dev    # terminal 2 → http://127.0.0.1:1420
```

## Checks before a PR

```powershell
cd kpower-app
npm test
npm run test:e2e
npm run build
```

## Guidelines

- **No secrets** — never commit Telegram tokens, chat IDs, SMTP passwords, or `.env` files
- **Honesty** — do not invent telemetry; bridge-down ≠ UPS fault
- **Control safety** — keep control gated; do not default `ALLOW_HID_CONTROL`
- **Scope** — this is a monitoring console, not an ERP or multi-tenant cloud product
- Prefer small PRs with a clear test plan

## Reporting bugs

Use GitHub Issues with: OS build, Node version, whether stock KPower was closed, bridge `/health` JSON, and steps to reproduce.

Security issues → see [SECURITY.md](SECURITY.md).
