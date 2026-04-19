import { supabase } from "@/integrations/supabase/client";

export type DoseStatus = "pending" | "taken" | "skipped" | "missed";

export type Medication = {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  notes: string | null;
  photo_url: string | null;
  times: string[];
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Dose = {
  id: string;
  user_id: string;
  medication_id: string;
  scheduled_at: string;
  status: DoseStatus;
  action_at: string | null;
  family_notified: boolean;
  created_at: string;
  updated_at: string;
};

export type DoseWithMed = Dose & { medication: Medication };

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseHHMMToToday = (hhmm: string, base: Date) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};

const isWithinRange = (med: Medication, date: Date) => {
  const day = dayKey(date);
  if (med.start_date && day < med.start_date) return false;
  if (med.end_date && day > med.end_date) return false;
  return med.active;
};

/**
 * Ensures medication_doses rows exist for the given user for "today" (local).
 * Idempotent: relies on UNIQUE(medication_id, scheduled_at).
 */
export async function ensureTodayDoses(userId: string, day = new Date()) {
  const { data: meds, error } = await supabase
    .from("medications")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true);
  if (error) throw error;

  const rows: { user_id: string; medication_id: string; scheduled_at: string }[] = [];
  for (const med of (meds ?? []) as Medication[]) {
    if (!isWithinRange(med, day)) continue;
    for (const t of med.times ?? []) {
      const at = parseHHMMToToday(t, day);
      rows.push({
        user_id: userId,
        medication_id: med.id,
        scheduled_at: at.toISOString(),
      });
    }
  }
  if (!rows.length) return;
  // upsert ignore conflicts (unique constraint on medication_id+scheduled_at)
  await supabase.from("medication_doses").upsert(rows, {
    onConflict: "medication_id,scheduled_at",
    ignoreDuplicates: true,
  });
}

export async function fetchTodayDoses(userId: string, day = new Date()): Promise<DoseWithMed[]> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("medication_doses")
    .select("*, medication:medications(*)")
    .eq("user_id", userId)
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DoseWithMed[];
}

export async function setDoseStatus(doseId: string, status: DoseStatus) {
  const { error } = await supabase
    .from("medication_doses")
    .update({ status, action_at: new Date().toISOString() })
    .eq("id", doseId);
  if (error) throw error;
}

export type AdherenceStats = {
  total: number;
  taken: number;
  missed: number;
  skipped: number;
  pending: number;
  adherence: number; // 0..1 over completed (taken/missed/skipped)
};

export async function fetchAdherence(userId: string, days = 30): Promise<AdherenceStats> {
  const start = new Date();
  start.setDate(start.getDate() - days);
  const { data, error } = await supabase
    .from("medication_doses")
    .select("status")
    .eq("user_id", userId)
    .gte("scheduled_at", start.toISOString());
  if (error) throw error;
  const stats = { total: 0, taken: 0, missed: 0, skipped: 0, pending: 0, adherence: 0 };
  for (const row of data ?? []) {
    stats.total++;
    stats[row.status as DoseStatus]++;
  }
  const decided = stats.taken + stats.missed + stats.skipped;
  stats.adherence = decided ? stats.taken / decided : 0;
  return stats;
}
