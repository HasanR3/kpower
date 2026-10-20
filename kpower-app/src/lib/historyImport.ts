import { loadHistory, saveHistory, type HistorySample } from "./appData";

const BRIDGE =
  (import.meta.env.VITE_HID_BRIDGE_URL as string | undefined)?.replace(/\/snapshot$/, "") ??
  "http://127.0.0.1:3921";

function isSample(v: unknown): v is HistorySample {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.at === "number" &&
    typeof r.loadPercent === "number" &&
    typeof r.batteryPercent === "number" &&
    typeof r.inputVoltage === "number" &&
    typeof r.outputVoltage === "number"
  );
}

/** Pull history-like rows from stock kpower.db via the HID bridge python helper. */
export async function importStockHistory(): Promise<{
  ok: boolean;
  message: string;
  imported: number;
}> {
  try {
    const res = await fetch(`${BRIDGE}/history/import-stock`, { method: "POST" });
    const body = (await res.json()) as {
      ok?: boolean;
      message?: string;
      samples?: unknown[];
    };
    if (!body.ok) {
      return { ok: false, message: body.message || "Import failed", imported: 0 };
    }
    const incoming = (body.samples || []).filter(isSample).map((s) => ({
      at: s.at,
      loadPercent: s.loadPercent,
      batteryPercent: s.batteryPercent,
      inputVoltage: s.inputVoltage,
      outputVoltage: s.outputVoltage,
      connected: Boolean(s.connected ?? true),
      mode: String(s.mode || "line"),
    }));
    if (incoming.length === 0) {
      return {
        ok: true,
        message: "Stock DB readable but no history-like samples mapped",
        imported: 0,
      };
    }
    const merged = [...loadHistory(), ...incoming].sort((a, b) => a.at - b.at);
    const seen = new Set<number>();
    const uniq: HistorySample[] = [];
    for (const s of merged) {
      if (seen.has(s.at)) continue;
      seen.add(s.at);
      uniq.push(s);
    }
    saveHistory(uniq);
    return {
      ok: true,
      message: `Imported ${incoming.length} samples from stock kpower.db`,
      imported: incoming.length,
    };
  } catch {
    return { ok: false, message: "Bridge unreachable — run npm run hid", imported: 0 };
  }
}
