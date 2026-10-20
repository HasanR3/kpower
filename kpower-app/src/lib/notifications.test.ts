import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_SETTINGS, saveSettings } from "./appData";
import { testSmtp, testTelegram, testWebhook } from "./notifications";

describe("notifications", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true, message: "delivered" }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses SMTP when disabled", async () => {
    saveSettings({ ...DEFAULT_SETTINGS, emailEnabled: false });
    const r = await testSmtp();
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/disabled/i);
  });

  it("posts SMTP when enabled and configured", async () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      emailEnabled: true,
      emailSmtpHost: "smtp.example.com",
      emailFrom: "a@b.c",
      emailTo: "d@e.f",
    });
    const r = await testSmtp();
    expect(r.ok).toBe(true);
    expect(fetch).toHaveBeenCalled();
  });

  it("refuses telegram without credentials", async () => {
    saveSettings({ ...DEFAULT_SETTINGS, telegramEnabled: true });
    const r = await testTelegram();
    expect(r.ok).toBe(false);
  });

  it("posts webhook when enabled", async () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      webhookEnabled: true,
      webhookUrl: "https://example.com/hook",
    });
    const r = await testWebhook();
    expect(r.ok).toBe(true);
  });
});
