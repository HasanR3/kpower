import { loadSettings, type AppSettings } from "./appData";

export type NotifyChannel = "smtp" | "telegram" | "webhook";

export interface NotifyResult {
  channel: NotifyChannel;
  ok: boolean;
  message: string;
  at: number;
}

const BRIDGE =
  (import.meta.env.VITE_HID_BRIDGE_URL as string | undefined)?.replace(/\/snapshot$/, "") ??
  "http://127.0.0.1:3921";

function mailBody(s: AppSettings, subject: string, text: string) {
  return {
    host: s.emailSmtpHost,
    port: s.emailSmtpPort,
    secure: s.emailSmtpPort === 465,
    username: s.emailUsername,
    password: s.emailPassword,
    from: s.emailFrom,
    to: s.emailTo,
    subject,
    text,
  };
}

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${BRIDGE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string };
  return {
    ok: Boolean(data.ok) && res.ok,
    message: data.message || `HTTP ${res.status}`,
  };
}

export async function testSmtp(settings: AppSettings = loadSettings()): Promise<NotifyResult> {
  const at = Date.now();
  if (!settings.emailEnabled) {
    return { channel: "smtp", ok: false, message: "Email notifications disabled", at };
  }
  if (!settings.emailSmtpHost || !settings.emailFrom || !settings.emailTo) {
    return { channel: "smtp", ok: false, message: "SMTP host/from/to incomplete", at };
  }
  try {
    const r = await postJson(
      "/mail/test",
      mailBody(settings, "KPower SMTP test", "KPower monitoring — SMTP path verified."),
    );
    return { channel: "smtp", ...r, at };
  } catch {
    return { channel: "smtp", ok: false, message: "Bridge unreachable — run npm run hid", at };
  }
}

/** Push bot credentials + power-event settings to the HID bridge. */
export async function syncTelegramBotConfig(
  settings: AppSettings = loadSettings(),
): Promise<NotifyResult> {
  const at = Date.now();
  try {
    const r = await postJson("/telegram/config", {
      enabled: settings.telegramEnabled,
      botToken: settings.telegramBotToken,
      chatId: settings.telegramChatId,
      outageMinutes: settings.telegramOutageMinutes || 5,
      notifyFail: settings.telegramNotifyPowerFail !== false,
      notifyRestore: settings.telegramNotifyPowerRestore !== false,
      notifyExtended: settings.telegramNotifyExtendedOutage !== false,
    });
    return { channel: "telegram", ...r, at };
  } catch {
    return { channel: "telegram", ok: false, message: "Bridge unreachable — run npm run hid", at };
  }
}

export async function testTelegram(settings: AppSettings = loadSettings()): Promise<NotifyResult> {
  const at = Date.now();
  if (!settings.telegramEnabled) {
    return { channel: "telegram", ok: false, message: "Telegram disabled", at };
  }
  if (!settings.telegramBotToken || !settings.telegramChatId) {
    return { channel: "telegram", ok: false, message: "Bot token / chat id incomplete", at };
  }
  try {
    await syncTelegramBotConfig(settings);
    const r = await postJson("/notify/telegram", {
      botToken: settings.telegramBotToken,
      chatId: settings.telegramChatId,
      text: [
        "KPower monitoring — Telegram connected.",
        "Try: /status /voltage /load /battery /freq",
        "Alerts: power off, power on, outage ≥ " + (settings.telegramOutageMinutes || 5) + " min",
      ].join("\n"),
    });
    return { channel: "telegram", ...r, at };
  } catch {
    return { channel: "telegram", ok: false, message: "Bridge unreachable — run npm run hid", at };
  }
}

export async function testWebhook(settings: AppSettings = loadSettings()): Promise<NotifyResult> {
  const at = Date.now();
  if (!settings.webhookEnabled) {
    return { channel: "webhook", ok: false, message: "Webhook disabled", at };
  }
  if (!settings.webhookUrl) {
    return { channel: "webhook", ok: false, message: "Webhook URL missing", at };
  }
  try {
    const r = await postJson("/notify/webhook", {
      url: settings.webhookUrl,
      payload: {
        source: "kpower",
        event: "test",
        at: new Date().toISOString(),
        message: "KPower monitoring — webhook path verified.",
      },
    });
    return { channel: "webhook", ...r, at };
  } catch {
    return { channel: "webhook", ok: false, message: "Bridge unreachable — run npm run hid", at };
  }
}

const notifiedCodes = new Set<string>();

/** Notify on newly raised alarms; dedupe while still active. */
export async function maybeNotifyNewAlarms(
  activeCodes: string[],
  details: { code: string; message: string; severity: string }[],
): Promise<void> {
  const s = loadSettings();
  for (const code of [...notifiedCodes]) {
    if (!activeCodes.includes(code)) notifiedCodes.delete(code);
  }
  for (const d of details) {
    if (!d.severity || d.severity === "info") continue;
    if (notifiedCodes.has(d.code)) continue;
    if (!activeCodes.includes(d.code)) continue;
    notifiedCodes.add(d.code);
    const text = `[KPower ${d.severity}] ${d.code}: ${d.message}`;
    if (s.emailEnabled && (s.emailOnAlarm || d.severity === "critical")) {
      try {
        await postJson("/mail/test", mailBody(s, `KPower alarm: ${d.code}`, text));
      } catch {
        /* honest: no throw to UI loop */
      }
    }
    if (s.telegramEnabled && s.telegramBotToken && s.telegramChatId) {
      try {
        await postJson("/notify/telegram", {
          botToken: s.telegramBotToken,
          chatId: s.telegramChatId,
          text,
        });
      } catch {
        /* ignore */
      }
    }
    if (s.webhookEnabled && s.webhookUrl) {
      try {
        await postJson("/notify/webhook", {
          url: s.webhookUrl,
          payload: { source: "kpower", event: "alarm", ...d, at: Date.now() },
        });
      } catch {
        /* ignore */
      }
    }
  }
}
