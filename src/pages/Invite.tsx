import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Link as LinkIcon, Copy, Share2, CheckCircle2, Clock, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { buildReferralLink } from "@/lib/referral";

type ReferralRow = {
  id: string;
  referred_user_id: string;
  status: "pending" | "completed";
  joined_at: string;
};

type ReferredProfile = {
  user_id: string;
  display_name: string | null;
};

const Invite = () => {
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ReferredProfile>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: profile }, { data: refs }] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("referrals")
          .select("id, referred_user_id, status, joined_at")
          .eq("referrer_id", user.id)
          .order("joined_at", { ascending: false }),
      ]);
      if (!active) return;
      setCode(profile?.referral_code ?? null);
      const list = (refs ?? []) as ReferralRow[];
      setReferrals(list);

      const ids = list.map((r) => r.referred_user_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", ids);
        if (!active) return;
        const map: Record<string, ReferredProfile> = {};
        (profs ?? []).forEach((p) => {
          map[p.user_id] = p as ReferredProfile;
        });
        setProfilesMap(map);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const link = useMemo(() => (code ? buildReferralLink(code) : ""), [code]);

  const stats = useMemo(() => {
    const total = referrals.length;
    const completed = referrals.filter((r) => r.status === "completed").length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [referrals]);

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: "Copied!", description: "Your invite link is on the clipboard." });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Copy failed", description: "Try copying manually.", variant: "destructive" });
    }
  };

  const handleWhatsApp = () => {
    if (!link) return;
    const text = encodeURIComponent(
      `I'm using LifeLink for medicine reminders, blood donor matching and a private health vault. Join me — it's free.\n\n${link}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  if (authLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-xl py-16 text-center">
        <h1 className="font-display text-3xl">Invite & Earn</h1>
        <p className="mt-2 text-muted-foreground">Sign in to get your unique referral link and track invites.</p>
        <Button asChild className="mt-6 rounded-full bg-gradient-primary text-primary-foreground">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-primary p-8 text-primary-foreground shadow-soft sm:p-10">
        <div className="flex items-center gap-2 text-sm/none uppercase tracking-wider opacity-90">
          <Sparkles className="h-4 w-4" />
          Invite & Earn
        </div>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl">Share LifeLink. Help someone breathe easier.</h1>
        <p className="mt-2 max-w-xl text-primary-foreground/85">
          Send your unique link to friends and family. Track who joins and watch your community grow.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total Invites" value={stats.total} tone="primary" />
        <StatCard icon={CheckCircle2} label="Active Referrals" value={stats.completed} tone="success" />
        <StatCard icon={Clock} label="Pending Verifications" value={stats.pending} tone="warning" />
      </div>

      {/* Sharing */}
      <Card className="mt-6 overflow-hidden border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LinkIcon className="h-5 w-5 text-primary" />
            Your unique invite link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 truncate rounded-xl border border-border bg-muted/40 px-4 py-3 font-mono text-sm">
              {link || "—"}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                className="rounded-full bg-gradient-primary text-primary-foreground hover:opacity-95"
                disabled={!link}
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy Link"}
              </Button>
              <Button onClick={handleWhatsApp} variant="outline" className="rounded-full" disabled={!link}>
                <Share2 className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </div>
          {code && (
            <p className="text-xs text-muted-foreground">
              Or share your code: <span className="font-mono font-semibold text-foreground">{code}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Referrals table */}
      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            People you've invited
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No referrals yet. Share your link above to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((r) => {
                  const profile = profilesMap[r.referred_user_id];
                  const name = profile?.display_name?.trim() || "New member";
                  const initials = name
                    .split(/\s+/)
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "U";
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                            {initials}
                          </span>
                          <span className="font-medium">{name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.joined_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "primary" | "success" | "warning";
}) => {
  const toneClasses = {
    primary: "bg-primary-soft text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-3xl">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: "pending" | "completed" }) => {
  if (status === "completed") {
    return (
      <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
      <Clock className="mr-1 h-3.5 w-3.5" />
      Pending
    </Badge>
  );
};

export default Invite;
