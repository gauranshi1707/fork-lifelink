import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { format } from "date-fns";
import {
  Droplet,
  Loader2,
  MapPin,
  Crosshair,
  Search,
  ShieldCheck,
  Eye,
  EyeOff,
  Send,
  Inbox,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  AlertCircle,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  BLOOD_GROUPS,
  COMPATIBLE_DONORS,
  URGENCY_LEVELS,
  eligibilityNote,
  findNearbyDonors,
  type BloodGroup,
  type ContactRequestStatus,
  type NearbyDonor,
  type UrgencyLevel,
} from "@/lib/donors";
import { DonorMap } from "@/components/donors/DonorMap";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DonorRow {
  id: string;
  user_id: string;
  blood_group: BloodGroup;
  city: string;
  latitude: number;
  longitude: number;
  last_donation_date: string | null;
  visible: boolean;
  note: string | null;
}

interface BloodRequestRow {
  id: string;
  requester_id: string;
  blood_group: BloodGroup;
  units: number;
  hospital: string;
  city: string;
  urgency: UrgencyLevel;
  status: "open" | "fulfilled" | "cancelled";
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface ContactRequestRow {
  id: string;
  request_id: string;
  donor_user_id: string;
  requester_id: string;
  status: ContactRequestStatus;
  message: string | null;
  responded_at: string | null;
  created_at: string;
}

const donorSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS as [BloodGroup, ...BloodGroup[]]),
  city: z.string().trim().min(2, "City is required").max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  lastDonationDate: z.string().optional(),
  note: z.string().max(280).optional(),
});

const requestSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS as [BloodGroup, ...BloodGroup[]]),
  units: z.number().int().min(1).max(20),
  hospital: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  urgency: z.enum(URGENCY_LEVELS as [UrgencyLevel, ...UrgencyLevel[]]),
  note: z.string().max(280).optional(),
});

const URGENCY_BADGE: Record<UrgencyLevel, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary-soft text-primary",
  high: "bg-warning/15 text-warning",
  critical: "bg-emergency/15 text-emergency",
};

export default function Donors() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <section className="container py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-border/60 bg-card p-10 text-center shadow-card">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emergency text-emergency-foreground shadow-glow">
            <Droplet className="h-8 w-8" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold">Sign in to find donors</h1>
          <p className="mt-3 text-muted-foreground">
            The Blood Donor Finder is a privacy-first community. Please sign in to register as a donor or post a request.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </section>
    );
  }

  return <DonorsAuthed userId={user.id} />;
}

function DonorsAuthed({ userId }: { userId: string }) {
  return (
    <section className="container py-10 sm:py-14">
      <header className="mb-8 max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-emergency/30 bg-emergency/10 px-3 py-1 text-xs font-medium text-emergency">
          <ShieldCheck className="h-3.5 w-3.5" />
          Privacy-first contact flow
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">Nearby Blood Donor Finder</h1>
        <p className="mt-2 text-muted-foreground">
          Donor identities and contact details are never shared until the donor explicitly accepts a request.
        </p>
      </header>

      <Tabs defaultValue="find" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="find" className="gap-1.5"><Search className="h-4 w-4" />Find</TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5"><Droplet className="h-4 w-4" />My donor</TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5"><Send className="h-4 w-4" />Requests</TabsTrigger>
          <TabsTrigger value="inbox" className="gap-1.5"><Inbox className="h-4 w-4" />Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="find"><FindTab userId={userId} /></TabsContent>
        <TabsContent value="profile"><DonorProfileTab userId={userId} /></TabsContent>
        <TabsContent value="requests"><RequestsTab userId={userId} /></TabsContent>
        <TabsContent value="inbox"><InboxTab userId={userId} /></TabsContent>
      </Tabs>
    </section>
  );
}

/* ============================================================
   FIND TAB — search + map + privacy-first consent flow
   ============================================================ */

function FindTab({ userId }: { userId: string }) {
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("O+");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(25);
  const [donors, setDonors] = useState<NearbyDonor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contactDonor, setContactDonor] = useState<NearbyDonor | null>(null);
  const [myOpenRequests, setMyOpenRequests] = useState<BloodRequestRow[]>([]);

  // Locate
  const locate = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation unavailable", description: "Your browser does not support GPS lookup.", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => toast({ title: "Could not get location", description: err.message, variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  useEffect(() => { locate(); }, []);

  // Load my open requests so we can attach a contact request to one
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("requester_id", userId)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setMyOpenRequests((data ?? []) as BloodRequestRow[]);
    })();
  }, [userId]);

  const compatibleGroups = useMemo(() => COMPATIBLE_DONORS[bloodGroup], [bloodGroup]);

  const search = async () => {
    if (!coords) {
      toast({ title: "Location needed", description: "Share your location or pick a city to search.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Run one search per compatible donor group, then merge & sort
      const all = await Promise.all(
        compatibleGroups.map((g) => findNearbyDonors(g, coords.lat, coords.lon, radius)),
      );
      const merged = all.flat().sort((a, b) => a.distance_km - b.distance_km);
      setDonors(merged);
      if (merged.length === 0) {
        toast({ title: "No donors yet", description: "No matching donors in this radius. Try widening it." });
      }
    } catch (e) {
      toast({ title: "Search failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search filters</CardTitle>
          <CardDescription>Compatible donor groups are matched automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Recipient blood group</Label>
            <Select value={bloodGroup} onValueChange={(v) => setBloodGroup(v as BloodGroup)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Matching donors: {compatibleGroups.join(", ")}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Search center</Label>
            <div className="flex gap-2">
              <Input
                placeholder="City (optional label)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Button type="button" variant="outline" size="icon" onClick={locate} title="Use my location">
                <Crosshair className="h-4 w-4" />
              </Button>
            </div>
            {coords && (
              <p className="text-xs text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" />
                {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Radius</Label>
              <span className="text-sm font-medium">{radius} km</span>
            </div>
            <Slider value={[radius]} onValueChange={(v) => setRadius(v[0])} min={5} max={50} step={5} />
          </div>

          <Button onClick={search} disabled={loading || !coords} className="w-full rounded-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search donors
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {coords ? (
          <DonorMap center={coords} donors={donors} radiusKm={radius} selectedId={selectedId} onSelect={setSelectedId} />
        ) : (
          <div className="grid h-[460px] place-items-center rounded-3xl border border-dashed border-border bg-muted/30 text-muted-foreground">
            <div className="text-center">
              <MapPin className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm">Share your location to see donors on the map</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {donors.length === 0 && !loading && (
            <p className="text-center text-sm text-muted-foreground">
              No donors yet. Run a search to see matches.
            </p>
          )}
          {donors.map((d) => (
            <Card
              key={d.donor_id}
              className={`cursor-pointer transition ${selectedId === d.donor_id ? "border-primary shadow-elevated" : ""}`}
              onClick={() => setSelectedId(d.donor_id)}
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-emergency/10 text-emergency font-semibold">
                    {d.blood_group}
                  </span>
                  <div>
                    <p className="font-medium">{d.city}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.distance_km.toFixed(1)} km · {eligibilityNote(d.last_donation_date)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={(e) => { e.stopPropagation(); setContactDonor(d); }}
                >
                  Request to contact
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ContactDonorDialog
        donor={contactDonor}
        onClose={() => setContactDonor(null)}
        userId={userId}
        myOpenRequests={myOpenRequests}
      />
    </div>
  );
}

function ContactDonorDialog({
  donor,
  onClose,
  userId,
  myOpenRequests,
}: {
  donor: NearbyDonor | null;
  onClose: () => void;
  userId: string;
  myOpenRequests: BloodRequestRow[];
}) {
  const [requestId, setRequestId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (donor) {
      setRequestId(myOpenRequests[0]?.id ?? "");
      setMessage("");
    }
  }, [donor, myOpenRequests]);

  if (!donor) return null;

  const submit = async () => {
    if (!requestId) {
      toast({ title: "Pick a request", description: "Create a blood request first under the Requests tab.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("donor_contact_requests").insert({
      request_id: requestId,
      donor_user_id: donor.user_id,
      requester_id: userId,
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request sent", description: "The donor will be notified. Their contact stays private until they accept." });
    onClose();
  };

  return (
    <Dialog open={!!donor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Request to contact a {donor.blood_group} donor
          </DialogTitle>
          <DialogDescription>
            We never reveal donor identity or contact info. The donor will see your message and can choose to share their details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link to your blood request</Label>
            {myOpenRequests.length === 0 ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
                You don't have any open requests yet. Create one in the <strong>Requests</strong> tab first.
              </p>
            ) : (
              <Select value={requestId} onValueChange={setRequestId}>
                <SelectTrigger><SelectValue placeholder="Select a request" /></SelectTrigger>
                <SelectContent>
                  {myOpenRequests.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.blood_group} · {r.units} unit{r.units > 1 ? "s" : ""} · {r.hospital}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Message to donor (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              placeholder="Briefly describe the urgency. Avoid sharing personal contact info here."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{message.length}/280</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button onClick={submit} disabled={submitting || !requestId} className="rounded-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send consent request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   MY DONOR PROFILE
   ============================================================ */

function DonorProfileTab({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<DonorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: "O+" as BloodGroup,
    city: "",
    latitude: 0,
    longitude: 0,
    lastDonationDate: "",
    note: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("donors").select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        const d = data as DonorRow;
        setProfile(d);
        setForm({
          bloodGroup: d.blood_group,
          city: d.city,
          latitude: d.latitude,
          longitude: d.longitude,
          lastDonationDate: d.last_donation_date ?? "",
          note: d.note ?? "",
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, latitude: +pos.coords.latitude.toFixed(6), longitude: +pos.coords.longitude.toFixed(6) })),
      (err) => toast({ title: "Could not get location", description: err.message, variant: "destructive" }),
    );
  };

  const save = async () => {
    const parsed = donorSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      blood_group: form.bloodGroup,
      city: form.city.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      last_donation_date: form.lastDonationDate || null,
      note: form.note.trim() || null,
    };
    const { data, error } = profile
      ? await supabase.from("donors").update(payload).eq("user_id", userId).select().maybeSingle()
      : await supabase.from("donors").insert(payload).select().maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setProfile(data as DonorRow);
    toast({ title: "Donor profile saved" });
  };

  const toggleVisibility = async (visible: boolean) => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("donors").update({ visible }).eq("user_id", userId).select().maybeSingle();
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      return;
    }
    setProfile(data as DonorRow);
    toast({ title: visible ? "You are visible to requesters" : "You are now hidden" });
  };

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{profile ? "Update donor profile" : "Become a donor"}</CardTitle>
          <CardDescription>Share your blood group and approximate location. Your identity stays hidden until you accept a request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Blood group</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => setForm((f) => ({ ...f, bloodGroup: v as BloodGroup }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. Mumbai" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Approximate location</Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                type="number"
                step="0.000001"
                value={form.latitude || ""}
                onChange={(e) => setForm((f) => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))}
                placeholder="Latitude"
              />
              <Input
                type="number"
                step="0.000001"
                value={form.longitude || ""}
                onChange={(e) => setForm((f) => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))}
                placeholder="Longitude"
              />
              <Button type="button" variant="outline" onClick={useMyLocation}>
                <Crosshair className="h-4 w-4" />
                Use mine
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Last donation date (optional)</Label>
            <Input type="date" value={form.lastDonationDate} onChange={(e) => setForm((f) => ({ ...f, lastDonationDate: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Donors are eligible 90+ days after their last donation.</p>
          </div>

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value.slice(0, 280) }))} rows={2} placeholder="Anything requesters should know" />
          </div>

          <Button onClick={save} disabled={saving} className="w-full rounded-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplet className="h-4 w-4" />}
            {profile ? "Save changes" : "Register as donor"}
          </Button>
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
            <CardDescription>Pause anytime. Hidden donors do not appear in any search.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                {profile.visible ? <Eye className="h-5 w-5 text-success" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="font-medium">{profile.visible ? "Visible to requesters" : "Hidden"}</p>
                  <p className="text-xs text-muted-foreground">Your contact info is never shown until you accept a request.</p>
                </div>
              </div>
              <Switch checked={profile.visible} onCheckedChange={toggleVisibility} />
            </div>

            <div className="rounded-2xl bg-primary-soft p-4 text-sm text-primary">
              <ShieldCheck className="mb-1 inline h-4 w-4" /> Your name, phone, and email stay private. Requesters only see your blood group, city, and approximate distance.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   MY REQUESTS
   ============================================================ */

function RequestsTab({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<BloodRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: "O+" as BloodGroup,
    units: 1,
    hospital: "",
    city: "",
    urgency: "normal" as UrgencyLevel,
    note: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("blood_requests")
      .select("*")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });
    setRequests((data ?? []) as BloodRequestRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const create = async () => {
    const parsed = requestSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check your request", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("blood_requests").insert({
      requester_id: userId,
      blood_group: form.bloodGroup,
      units: form.units,
      hospital: form.hospital.trim(),
      city: form.city.trim(),
      urgency: form.urgency,
      note: form.note.trim() || null,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Could not post", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request posted", description: "Now find matching donors in the Find tab." });
    setForm({ bloodGroup: "O+", units: 1, hospital: "", city: "", urgency: "normal", note: "" });
    load();
  };

  const updateStatus = async (id: string, status: "fulfilled" | "cancelled") => {
    const { error } = await supabase.from("blood_requests").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Post a blood request</CardTitle>
          <CardDescription>Anyone signed in can see open requests. Donors are contacted only with consent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Blood group</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => setForm((f) => ({ ...f, bloodGroup: v as BloodGroup }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Units</Label>
              <Input type="number" min={1} max={20} value={form.units} onChange={(e) => setForm((f) => ({ ...f, units: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hospital</Label>
            <Input value={form.hospital} onChange={(e) => setForm((f) => ({ ...f, hospital: e.target.value }))} placeholder="Hospital name" />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Urgency</Label>
            <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v as UrgencyLevel }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {URGENCY_LEVELS.map((u) => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value.slice(0, 280) }))} rows={2} />
          </div>
          <Button onClick={create} disabled={creating} className="w-full rounded-full">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post request
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold">Your requests</h3>
        {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />}
        {!loading && requests.length === 0 && (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        )}
        {requests.map((r) => (
          <RequestCard key={r.id} request={r} onUpdate={updateStatus} />
        ))}
      </div>
    </div>
  );
}

function RequestCard({ request, onUpdate }: { request: BloodRequestRow; onUpdate: (id: string, status: "fulfilled" | "cancelled") => void }) {
  const [contacts, setContacts] = useState<(ContactRequestRow & { profile?: { display_name: string | null; phone: string | null; emergency_contact_email: string | null } | null })[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("donor_contact_requests")
        .select("*")
        .eq("request_id", request.id)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as ContactRequestRow[];
      // Fetch profiles for accepted only — RLS still protects others
      const accepted = rows.filter((c) => c.status === "accepted");
      const profiles: Record<string, { display_name: string | null; phone: string | null; emergency_contact_email: string | null } | null> = {};
      if (accepted.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, phone, emergency_contact_email")
          .in("user_id", accepted.map((c) => c.donor_user_id));
        for (const p of profs ?? []) profiles[(p as any).user_id] = { display_name: (p as any).display_name, phone: (p as any).phone, emergency_contact_email: (p as any).emergency_contact_email };
      }
      setContacts(rows.map((c) => ({ ...c, profile: profiles[c.donor_user_id] ?? null })));
    })();
  }, [request.id]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emergency/10 text-emergency font-semibold">
              {request.blood_group}
            </span>
            <div>
              <p className="font-medium">{request.units} unit{request.units > 1 ? "s" : ""} · {request.hospital}</p>
              <p className="text-xs text-muted-foreground">{request.city} · {format(new Date(request.created_at), "PP")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={URGENCY_BADGE[request.urgency]}>{request.urgency}</Badge>
            <Badge variant="outline">{request.status}</Badge>
          </div>
        </div>

        {request.note && <p className="mt-3 text-sm text-muted-foreground">{request.note}</p>}

        {contacts.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact requests</p>
            {contacts.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{c.status}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "PPp")}</span>
                </div>
                {c.status === "accepted" && c.profile && (
                  <div className="mt-2 space-y-1 text-foreground">
                    {c.profile.display_name && <p>👤 {c.profile.display_name}</p>}
                    {c.profile.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> <a href={`tel:${c.profile.phone}`} className="text-primary underline">{c.profile.phone}</a></p>}
                    {c.profile.emergency_contact_email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> <a href={`mailto:${c.profile.emergency_contact_email}`} className="text-primary underline">{c.profile.emergency_contact_email}</a></p>}
                  </div>
                )}
                {c.status === "declined" && <p className="mt-1 text-xs text-muted-foreground">Donor declined — try another match.</p>}
                {c.status === "pending" && <p className="mt-1 text-xs text-muted-foreground">Awaiting donor's consent.</p>}
              </div>
            ))}
          </div>
        )}

        {request.status === "open" && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => onUpdate(request.id, "fulfilled")}>
              <CheckCircle2 className="h-4 w-4" /> Mark fulfilled
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => onUpdate(request.id, "cancelled")}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   INBOX — donor decides whether to share contact
   ============================================================ */

function InboxTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<(ContactRequestRow & { request?: BloodRequestRow })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: contacts } = await supabase
      .from("donor_contact_requests")
      .select("*")
      .eq("donor_user_id", userId)
      .order("created_at", { ascending: false });
    const rows = (contacts ?? []) as ContactRequestRow[];
    const requestIds = [...new Set(rows.map((r) => r.request_id))];
    let requests: Record<string, BloodRequestRow> = {};
    if (requestIds.length > 0) {
      const { data: reqs } = await supabase.from("blood_requests").select("*").in("id", requestIds);
      for (const r of (reqs ?? []) as BloodRequestRow[]) requests[r.id] = r;
    }
    setItems(rows.map((c) => ({ ...c, request: requests[c.request_id] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const respond = async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase
      .from("donor_contact_requests")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Could not respond", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: status === "accepted" ? "Contact shared" : "Request declined",
      description: status === "accepted" ? "The requester can now see your contact details." : "No details were shared.",
    });
    load();
  };

  if (loading) return <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-medium">No contact requests yet</p>
        <p className="text-sm text-muted-foreground">Requesters who match your blood group can ask to contact you here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4 text-sm text-primary">
        <ShieldCheck className="mb-1 inline h-4 w-4" /> Your contact info is shared only when you tap <strong>Accept</strong>.
      </div>
      {items.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  Request for {c.request?.blood_group ?? "?"} · {c.request?.units ?? 0} unit{(c.request?.units ?? 0) > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.request?.hospital} · {c.request?.city} · {format(new Date(c.created_at), "PPp")}
                </p>
              </div>
              <Badge className={c.request ? URGENCY_BADGE[c.request.urgency] : ""}>
                {c.request?.urgency ?? "—"}
              </Badge>
            </div>
            {c.message && <p className="mt-3 rounded-xl bg-muted/40 p-3 text-sm">"{c.message}"</p>}

            {c.status === "pending" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full" onClick={() => respond(c.id, "accepted")}>
                  <CheckCircle2 className="h-4 w-4" /> Share my contact
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => respond(c.id, "declined")}>
                  <XCircle className="h-4 w-4" /> Decline
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-sm">
                {c.status === "accepted" ? (
                  <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="h-4 w-4" /> Contact shared</span>
                ) : c.status === "declined" ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><XCircle className="h-4 w-4" /> Declined</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="h-4 w-4" /> {c.status}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
