import type { DoseWithMed } from "@/lib/medications";

type FiredKey = string; // dose.id

const FIRED_STORAGE_KEY = "medreminder.firedDoses";
const MAX_TIMEOUT_MS = 2 ** 31 - 1; // ~24.8 days, setTimeout cap

const loadFired = (): Set<FiredKey> => {
  try {
    const raw = localStorage.getItem(FIRED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { ids: FiredKey[]; day: string };
    const today = new Date().toDateString();
    if (parsed.day !== today) return new Set(); // reset daily
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
};

const saveFired = (set: Set<FiredKey>) => {
  try {
    localStorage.setItem(
      FIRED_STORAGE_KEY,
      JSON.stringify({ day: new Date().toDateString(), ids: [...set] }),
    );
  } catch {
    /* ignore */
  }
};

export type ScheduleOptions = {
  notify: (title: string, options?: NotificationOptions & { onClick?: () => void }) => void;
  onFire?: (dose: DoseWithMed) => void;
};

/**
 * Schedules a browser Notification for each pending dose's scheduled_at.
 * - Only schedules pending doses in the future (or just past, within 60s grace).
 * - De-dupes per dose-id using localStorage so reloads don't re-fire.
 * - Returns a cleanup function that clears all timers.
 */
export function scheduleDoseNotifications(doses: DoseWithMed[], opts: ScheduleOptions): () => void {
  const fired = loadFired();
  const timers: number[] = [];
  const now = Date.now();

  for (const dose of doses) {
    if (dose.status !== "pending") continue;
    if (fired.has(dose.id)) continue;

    const at = new Date(dose.scheduled_at).getTime();
    const delay = at - now;

    // Skip if more than ~24 days away (will be re-scheduled on next refresh)
    if (delay > MAX_TIMEOUT_MS) continue;

    const fire = () => {
      if (fired.has(dose.id)) return;
      fired.add(dose.id);
      saveFired(fired);
      const time = new Date(dose.scheduled_at).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      const body = dose.medication.dosage
        ? `${dose.medication.dosage} • ${time}`
        : `Scheduled for ${time}`;
      opts.notify(`Time for ${dose.medication.name}`, {
        body,
        tag: `dose-${dose.id}`,
        requireInteraction: false,
        onClick: () => opts.onFire?.(dose),
      });
      opts.onFire?.(dose);
    };

    if (delay <= 60_000 && delay >= -60_000) {
      // Within 1 minute window — fire immediately
      fire();
    } else if (delay > 0) {
      const id = window.setTimeout(fire, delay);
      timers.push(id);
    }
    // delay < -60s: too late, skip (will be marked missed by cron)
  }

  return () => {
    for (const id of timers) clearTimeout(id);
  };
}
