import {
  loadSchedules,
  loadSettings,
  runControlCommand,
  saveCommandResults,
  loadCommandResults,
  saveSchedules,
  type ControlCommand,
  type ScheduleAction,
  type ScheduleItem,
} from "./appData";
import { getLatestSnapshot } from "./upsStore";

function mapAction(action: ScheduleAction): ControlCommand | null {
  switch (action) {
    case "selfTest":
      return "selfTest10s";
    case "buzzerMute":
      return "buzzerToggle";
    case "upsOff":
      return "closeOutputMinutes";
    case "shutdownOs":
      return null;
    default:
      return null;
  }
}

function isDue(item: ScheduleItem, now: number): boolean {
  if (!item.enabled) return false;
  const at = Date.parse(item.runAt);
  return Number.isFinite(at) && at <= now;
}

/**
 * Due jobs run only when allowControl is enabled; otherwise they are skipped
 * and disabled with an audited failure message.
 */
export async function tickSchedules(): Promise<number> {
  const now = Date.now();
  const items = loadSchedules();
  const due = items.filter((i) => isDue(i, now));
  if (due.length === 0) return 0;

  const allow = loadSettings().allowControl;
  const snapshot = getLatestSnapshot();
  const connected = Boolean(snapshot?.connected);
  let ran = 0;
  let next = [...items];

  for (const job of due) {
    if (!allow) {
      const results = loadCommandResults();
      saveCommandResults(
        [
          {
            id: `sch-${job.id}-${now}`,
            command: "selfTest10s" as ControlCommand,
            ok: false,
            message: `Schedule "${job.label}" skipped: Allow control is off`,
            at: now,
          },
          ...results,
        ].slice(0, 200),
      );
    } else {
      const cmd = mapAction(job.action);
      if (!cmd) {
        const results = loadCommandResults();
        saveCommandResults(
          [
            {
              id: `sch-${job.id}-${now}`,
              command: "selfTest10s" as ControlCommand,
              ok: false,
              message: `Schedule "${job.label}": action ${job.action} is not HID-mappable yet`,
              at: now,
            },
            ...results,
          ].slice(0, 200),
        );
      } else {
        const detail = cmd === "closeOutputMinutes" ? "1 minute(s)" : undefined;
        const result = await runControlCommand(cmd, connected, detail);
        const results = loadCommandResults();
        saveCommandResults(
          [
            {
              ...result,
              message: `Schedule "${job.label}": ${result.message}`,
            },
            ...results,
          ].slice(0, 200),
        );
        ran += 1;
      }
    }
    next = next.map((i) => (i.id === job.id ? { ...i, enabled: false } : i));
  }

  saveSchedules(next);
  return ran;
}
