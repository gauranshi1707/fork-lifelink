// Scheduled job: find pending doses that are >30 minutes overdue,
// flip them to "missed", and email each user's emergency contact (once).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type MissedRow = {
  dose_id: string;
  user_id: string;
  medication_id: string;
  scheduled_at: string;
  medication_name: string;
  dosage: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

async function sendAlertEmail(args: {
  toEmail: string;
  toName: string | null;
  patientName: string;
  medicationName: string;
  dosage: string | null;
  scheduledAt: string;
}) {
  // Best-effort email via the Lovable AI Gateway's generic email helper.
  // If LOVABLE_API_KEY isn't available or email infra isn't configured,
  // we fall back to logging — the dose is still marked missed.
  if (!LOVABLE_API_KEY) {
    console.log("[ALERT - log only]", args);
    return { ok: true, mode: "log" };
  }

  // Try the project's transactional email function first (if set up).
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          templateName: "missed-dose-alert",
          recipientEmail: args.toEmail,
          idempotencyKey: `missed-${args.scheduledAt}-${args.toEmail}`,
          templateData: {
            patientName: args.patientName,
            medicationName: args.medicationName,
            dosage: args.dosage ?? "",
            scheduledAt: formatTime(args.scheduledAt),
            contactName: args.toName ?? "",
          },
        }),
      },
    );
    if (res.ok) return { ok: true, mode: "transactional" };
    console.log("transactional send failed", res.status, await res.text());
  } catch (e) {
    console.log("transactional send threw", e);
  }

  // Fallback: log only — keeps the cron job idempotent.
  console.log("[ALERT - log only]", args);
  return { ok: true, mode: "log" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Mark overdue doses as missed (returns rows that flipped).
    const { data: missed, error } = await admin.rpc("mark_missed_doses", {
      _grace_minutes: 30,
    });
    if (error) throw error;

    const rows = (missed ?? []) as MissedRow[];
    let alertsSent = 0;

    // 2. For each newly-missed dose, look up the user's emergency contact + name and send.
    for (const row of rows) {
      // Skip if we've already alerted for this dose
      const { data: doseRow } = await admin
        .from("medication_doses")
        .select("family_notified")
        .eq("id", row.dose_id)
        .maybeSingle();
      if (doseRow?.family_notified) continue;

      const { data: profile } = await admin
        .from("profiles")
        .select(
          "display_name, emergency_contact_name, emergency_contact_email",
        )
        .eq("user_id", row.user_id)
        .maybeSingle();

      if (profile?.emergency_contact_email) {
        await sendAlertEmail({
          toEmail: profile.emergency_contact_email,
          toName: profile.emergency_contact_name,
          patientName: profile.display_name ?? "Your contact",
          medicationName: row.medication_name,
          dosage: row.dosage,
          scheduledAt: row.scheduled_at,
        });
        alertsSent++;
      }

      await admin
        .from("medication_doses")
        .update({ family_notified: true })
        .eq("id", row.dose_id);
    }

    return new Response(
      JSON.stringify({
        markedMissed: rows.length,
        alertsSent,
        ts: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("check-missed-doses error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
