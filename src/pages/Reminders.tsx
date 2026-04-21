import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Pill,
  Plus,
  Loader2,
  Check,
  X,
  Trash2,
  Clock,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  Power,
  PowerOff,
  Bell,
  BellOff,
  BellRing,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { scheduleDoseNotifications } from "@/lib/doseScheduler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  AdherenceStats,
  DoseStatus,
  DoseWithMed,
  Medication,
  ensureTodayDoses,
  fetchAdherence,
  fetchTodayDoses,
  setDoseStatus,
} from "@/lib/medications";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<DoseStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  taken: "bg-primary-soft text-primary",
  skipped: "bg-secondary text-secondary-foreground",
  missed: "bg-emergency/10 text-emergency",
};

const STATUS_LABEL: Record<DoseStatus, string> = {
  pending: "Pending",
  taken: "Taken",
  skipped: "Skipped",
  missed: "Missed",
};

const Reminders = () => {
  const { user, loading: authLoading } = useAuth();
  const notifications = useNotifications();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [doses, setDoses] = useState<DoseWithMed[]>([]);
  const [adherence, setAdherence] = useState<AdherenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = async (uid: string) => {
    await ensureTodayDoses(uid);
    const [{ data: medRows }, todayDoses, stats] = await Promise.all([
      supabase.from("medications").select("*").eq("user_id", uid).order("created_at"),
      fetchTodayDoses(uid),
      fetchAdherence(uid, 30),
    ]);
    setMeds((medRows ?? []) as Medication[]);
    setDoses(todayDoses);
    setAdherence(stats);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);
    refresh(user.id)
      .catch((e) => toast({ title: "Couldn't load reminders", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  // Schedule browser notifications for pending doses whenever the list changes.
  useEffect(() => {
    if (notifications.permission !== "granted" || doses.length === 0) return;
    const cleanup = scheduleDoseNotifications(doses, {
      notify: notifications.notify,
      onFire: () => {
        // Re-fetch so the dose appears in the right state if user acted via OS UI.
        if (user) fetchTodayDoses(user.id).then(setDoses).catch(() => {});
      },
    });
    return cleanup;
  }, [doses, notifications.permission, notifications.notify, user]);

  const handleStatus = async (doseId: string, status: DoseStatus) => {
    const prev = doses;
    setDoses((d) => d.map((x) => (x.id === doseId ? { ...x, status, action_at: new Date().toISOString() } : x)));
    try {
      await setDoseStatus(doseId, status);
      if (user) {
        const stats = await fetchAdherence(user.id, 30);
        setAdherence(stats);
      }
    } catch (e) {
      setDoses(prev);
      toast({ title: "Couldn't update dose", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (med: Medication) => {
    const next = !med.active;
    setMeds((ms) => ms.map((m) => (m.id === med.id ? { ...m, active: next } : m)));
    const { error } = await supabase.from("medications").update({ active: next }).eq("id", med.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      setMeds((ms) => ms.map((m) => (m.id === med.id ? { ...m, active: med.active } : m)));
      return;
    }
    if (user) await refresh(user.id);
  };

  const handleDelete = async (med: Medication) => {
    if (!confirm(`Delete ${med.name}? This also removes its scheduled doses.`)) return;
    const { error } = await supabase.from("medications").delete().eq("id", med.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    if (user) await refresh(user.id);
    toast({ title: "Medication removed" });
  };

  // Auth gating
  if (authLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <SignedOutPrompt />;

  return (
    <div className="container py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Smart Medicine</p>
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Today's reminders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark doses taken or skipped. If a dose is more than 30 minutes overdue, your emergency contact is alerted.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
              Add medication
            </Button>
          </DialogTrigger>
          <AddMedicationDialog
            userId={user.id}
            onCreated={async () => {
              setDialogOpen(false);
              await refresh(user.id);
              toast({ title: "Medication added" });
            }}
          />
        </Dialog>
      </header>

      <NotificationBanner
        permission={notifications.permission}
        supported={notifications.supported}
        onEnable={async () => {
          const result = await notifications.request();
          if (result === "granted") {
            notifications.notify("Reminders enabled", {
              body: "We'll nudge you when each dose is due.",
            });
            toast({ title: "Notifications enabled" });
          } else if (result === "denied") {
            toast({
              title: "Notifications blocked",
              description: "Enable them in your browser site settings to get dose nudges.",
              variant: "destructive",
            });
          }
        }}
      />

      {loading ? (
        <div className="mt-12 grid place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Today schedule */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl">Today</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
            {doses.length === 0 ? (
              <EmptySchedule hasMeds={meds.length > 0} onAdd={() => setDialogOpen(true)} />
            ) : (
              <ul className="space-y-3">
                {doses.map((d) => (
                  <DoseCard key={d.id} dose={d} onSetStatus={handleStatus} />
                ))}
              </ul>
            )}
          </section>

          {/* Side: adherence + medications */}
          <aside className="space-y-6">
            <AdherenceCard stats={adherence} />
            <MedicationsList meds={meds} onToggle={handleToggleActive} onDelete={handleDelete} />
          </aside>
        </div>
      )}
    </div>
  );
};

const NotificationBanner = ({
  permission,
  supported,
  onEnable,
}: {
  permission: "default" | "granted" | "denied" | "unsupported";
  supported: boolean;
  onEnable: () => void;
}) => {
  if (!supported) return null;
  if (permission === "granted") {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft/40 px-4 py-3 text-sm">
        <BellRing className="h-4 w-4 text-primary" />
        <span className="text-foreground/80">
          Browser reminders are on. Keep this tab open to get a nudge at each dose time.
        </span>
      </div>
    );
  }
  if (permission === "denied") {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emergency/20 bg-emergency/5 px-4 py-3 text-sm">
        <BellOff className="mt-0.5 h-4 w-4 text-emergency" />
        <div className="text-foreground/80">
          Notifications are blocked for this site. Enable them in your browser's site settings to
          get dose reminders.
        </div>
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3 sm:items-center">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Bell className="h-4 w-4" />
        </span>
        <div className="text-sm">
          <p className="font-medium">Get a nudge at dose time</p>
          <p className="text-muted-foreground">
            Allow browser notifications so you don't miss a reminder while this tab is open.
          </p>
        </div>
      </div>
      <Button onClick={onEnable} className="rounded-full sm:ml-auto" size="sm">
        <Bell className="h-4 w-4" />
        Enable notifications
      </Button>
    </div>
  );
};

const SignedOutPrompt = () => (
  <div className="container grid min-h-[60vh] place-items-center py-20">
    <div className="max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center shadow-soft">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Pill className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-display text-2xl">Sign in to set reminders</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Reminders are tied to your account so we can alert your emergency contact if a dose is missed.
      </p>
      <Button asChild className="mt-6 rounded-full bg-gradient-primary text-primary-foreground">
        <Link to="/auth?mode=signup">Create a free account</Link>
      </Button>
    </div>
  </div>
);

const EmptySchedule = ({ hasMeds, onAdd }: { hasMeds: boolean; onAdd: () => void }) => (
  <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
    <Clock className="mx-auto h-7 w-7 text-muted-foreground" />
    <h3 className="mt-3 font-medium">{hasMeds ? "No doses scheduled today" : "No medications yet"}</h3>
    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
      {hasMeds
        ? "Your active medications don't have a dose due today. Check the dosing window or add another time."
        : "Add your first medication to start receiving reminders and tracking adherence."}
    </p>
    <Button onClick={onAdd} className="mt-4 rounded-full" variant="outline">
      <Plus className="h-4 w-4" />
      Add medication
    </Button>
  </div>
);

const DoseCard = ({
  dose,
  onSetStatus,
}: {
  dose: DoseWithMed;
  onSetStatus: (id: string, s: DoseStatus) => void;
}) => {
  const time = new Date(dose.scheduled_at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const isPending = dose.status === "pending";

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-4 transition-base hover:border-primary/30 sm:flex-row sm:items-center">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Pill className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{dose.medication.name}</h3>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[dose.status])}>
            {STATUS_LABEL[dose.status]}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">{time}</span>
          {dose.medication.dosage ? ` · ${dose.medication.dosage}` : ""}
          {dose.medication.notes ? ` · ${dose.medication.notes}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isPending ? (
          <>
            <Button
              size="sm"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onSetStatus(dose.id, "taken")}
            >
              <Check className="h-4 w-4" /> Taken
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => onSetStatus(dose.id, "skipped")}
            >
              <X className="h-4 w-4" /> Skip
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => onSetStatus(dose.id, "pending")}
          >
            Undo
          </Button>
        )}
      </div>
    </li>
  );
};

const AdherenceCard = ({ stats }: { stats: AdherenceStats | null }) => {
  const pct = stats ? Math.round(stats.adherence * 100) : 0;
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg">30-day adherence</h2>
      </div>
      <div className="mt-4 flex items-end gap-2">
        <span className="font-display text-5xl tracking-tight">{pct}%</span>
        <span className="pb-2 text-sm text-muted-foreground">
          {stats?.taken ?? 0} of {(stats?.taken ?? 0) + (stats?.missed ?? 0) + (stats?.skipped ?? 0)} doses taken
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {stats && stats.missed > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-emergency">
          <AlertTriangle className="h-3.5 w-3.5" />
          {stats.missed} missed dose{stats.missed === 1 ? "" : "s"} in the last 30 days
        </p>
      )}
    </div>
  );
};

const MedicationsList = ({
  meds,
  onToggle,
  onDelete,
}: {
  meds: Medication[];
  onToggle: (m: Medication) => void;
  onDelete: (m: Medication) => void;
}) => (
  <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
    <h2 className="font-display text-lg">Your medications</h2>
    {meds.length === 0 ? (
      <p className="mt-3 text-sm text-muted-foreground">Nothing here yet.</p>
    ) : (
      <ul className="mt-4 space-y-2">
        {meds.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-border/40 bg-background px-3 py-2.5"
          >
            <div className={cn("h-2 w-2 rounded-full", m.active ? "bg-primary" : "bg-muted-foreground/40")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.dosage ? `${m.dosage} · ` : ""}
                {m.times?.length ? m.times.join(", ") : "no times"}
              </p>
            </div>
            <button
              onClick={() => onToggle(m)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={m.active ? "Pause" : "Resume"}
              title={m.active ? "Pause" : "Resume"}
            >
              {m.active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onDelete(m)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-emergency/10 hover:text-emergency"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ----------------- Add medication dialog -----------------

const AddMedicationDialog = ({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: () => Promise<void> | void;
}) => {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [notes, setNotes] = useState("");
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(""); setDosage(""); setNotes(""); setTimes(["09:00"]);
    setStartDate(new Date().toISOString().slice(0, 10)); setEndDate("");
  };

  const updateTime = (i: number, v: string) =>
    setTimes((t) => t.map((x, idx) => (idx === i ? v : x)));
  const addTime = () => setTimes((t) => [...t, "20:00"]);
  const removeTime = (i: number) => setTimes((t) => t.filter((_, idx) => idx !== i));

  const valid = useMemo(
    () => name.trim().length > 0 && times.every((t) => /^\d{2}:\d{2}$/.test(t)) && times.length > 0,
    [name, times],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("medications").insert({
        user_id: userId,
        name: name.trim(),
        dosage: dosage.trim() || null,
        notes: notes.trim() || null,
        times,
        start_date: startDate,
        end_date: endDate || null,
        active: true,
      });
      if (error) throw error;
      reset();
      await onCreated();
    } catch (e) {
      toast({ title: "Couldn't add", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add a medication</DialogTitle>
        <DialogDescription>We'll generate dose reminders for each time you set, every day.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="med-name">Name</Label>
          <Input id="med-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Metformin" required maxLength={120} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="med-dosage">Dosage</Label>
            <Input id="med-dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="500 mg" maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="med-start">Start date</Label>
            <Input id="med-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="med-end">End date <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="med-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Times per day</Label>
          <div className="space-y-2">
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} className="max-w-[160px]" />
                {times.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeTime(i)} className="text-muted-foreground">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addTime}>
            <Plus className="h-4 w-4" /> Add time
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="med-notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea id="med-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Take with food" maxLength={400} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={!valid || submitting} className="rounded-full bg-gradient-primary text-primary-foreground">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add medication
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default Reminders;
