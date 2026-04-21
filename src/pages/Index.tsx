import { Link } from "react-router-dom";
import {
  MessageCircleHeart,
  Pill,
  Droplet,
  Siren,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  HeartPulse,
  Lock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    to: "/chat",
    icon: MessageCircleHeart,
    title: "Mental Health Chat",
    desc: "Anonymous, judgment-free support with instant crisis helplines when it matters most.",
    accent: "from-primary/15 to-primary/5",
    iconBg: "bg-primary text-primary-foreground",
    badge: "No login needed",
  },
  {
    to: "/reminders",
    icon: Pill,
    title: "Medicine Reminders",
    desc: "Smart dosage schedules with family alerts if a dose is missed for 30 minutes.",
    accent: "from-accent/15 to-accent/5",
    iconBg: "bg-accent text-accent-foreground",
    badge: "Family alerts",
  },
  {
    to: "/donors",
    icon: Droplet,
    title: "Blood Donor Finder",
    desc: "Find compatible donors nearby. Privacy-first contact — donor approval required.",
    accent: "from-emergency/15 to-emergency/5",
    iconBg: "bg-emergency text-emergency-foreground",
    badge: "Map view",
  },
  {
    to: "/sos",
    icon: Siren,
    title: "Emergency SOS",
    desc: "One tap finds the nearest 24/7 hospitals and police stations using your location.",
    accent: "from-crisis/15 to-crisis/5",
    iconBg: "bg-crisis text-crisis-foreground",
    badge: "Works offline-first",
  },
  {
    to: "/vault",
    icon: ShieldCheck,
    title: "Digital Health Vault",
    desc: "Securely store prescriptions and reports. Share with your doctor via expiring links.",
    accent: "from-primary-glow/20 to-primary-glow/5",
    iconBg: "bg-primary-glow text-primary-foreground",
    badge: "Encrypted",
  },
];

const STATS = [
  { label: "Free, always", value: "100%", icon: HeartPulse },
  { label: "Private by default", value: "E2E", icon: Lock },
  { label: "Community powered", value: "24/7", icon: Users },
];

const Index = () => {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(40rem 20rem at 80% -10%, hsl(var(--primary-glow) / 0.18), transparent 60%), radial-gradient(30rem 16rem at 0% 110%, hsl(var(--accent) / 0.14), transparent 60%)",
          }}
        />
        <div className="container relative grid gap-12 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Five tools. One trusted companion.
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Care that's <span className="text-primary">close</span>,
              <br className="hidden sm:block" /> when life feels far.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              LifeLink brings together anonymous mental health support, medicine reminders, a community blood donor
              network, emergency SOS, and a private health vault — all built for accessibility and real-time help.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-gradient-primary text-primary-foreground shadow-elevated hover:opacity-95"
              >
                <Link to="/chat">
                  Start a chat
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-emergency/40 text-emergency hover:bg-emergency/10 hover:text-emergency"
              >
                <Link to="/sos">
                  <Siren className="h-4 w-4" />
                  Emergency SOS
                </Link>
              </Button>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-soft">
                  <s.icon className="h-4 w-4 text-primary" />
                  <dt className="mt-2 text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="font-display text-xl font-semibold">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Visual collage */}
          <div className="relative hidden md:col-span-5 md:block">
            <div className="absolute right-0 top-4 h-72 w-72 rounded-3xl bg-card shadow-elevated border border-border/60 p-6 rotate-[-4deg]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <MessageCircleHeart className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Anonymous chat</p>
                  <p className="text-xs text-muted-foreground">No sign-up</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm">
                  I'm feeling overwhelmed today.
                </div>
                <div className="ml-6 rounded-2xl rounded-tr-sm bg-primary-soft px-3 py-2 text-sm text-primary">
                  I hear you. Want to talk about what's weighing on you?
                </div>
              </div>
            </div>

            <div className="absolute left-2 top-44 h-44 w-56 rounded-3xl bg-card shadow-card border border-border/60 p-5 rotate-[3deg]">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Pill className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold">8:00 AM</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Metformin · 500mg</p>
              <Button size="sm" className="mt-3 w-full rounded-full bg-success text-success-foreground hover:bg-success/90">
                Mark as taken
              </Button>
            </div>

            <div className="absolute bottom-0 right-8 h-40 w-48 rounded-3xl bg-gradient-emergency shadow-emergency p-5 rotate-[-2deg] text-emergency-foreground">
              <Siren className="h-5 w-5" />
              <p className="mt-2 font-display text-2xl font-semibold leading-tight">SOS</p>
              <p className="mt-1 text-xs opacity-90">Nearest hospital: 1.2 km</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need, in one place
          </h2>
          <p className="mt-3 text-muted-foreground">
            Designed for accessibility, built for emergencies, and gentle on every screen.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Link
              key={f.to}
              to={f.to}
              className={cn(
                "group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 transition-smooth",
                "hover:-translate-y-1 hover:shadow-elevated",
                i === 0 && "lg:col-span-1",
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 -z-10 bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-100",
                  f.accent,
                )}
              />
              <div className="flex items-start justify-between">
                <span className={cn("grid h-12 w-12 place-items-center rounded-2xl shadow-soft", f.iconBg)}>
                  <f.icon className="h-6 w-6" strokeWidth={2.25} />
                </span>
                <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {f.badge}
                </span>
              </div>

              <h3 className="mt-5 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>

              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                Open
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust band */}
      <section className="border-y border-border/60 bg-muted/40">
        <div className="container grid gap-8 py-14 md:grid-cols-3">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Lock className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-semibold">Privacy first</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your chats are anonymous. Your records are encrypted. Donor details are never shared without consent.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <HeartPulse className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-semibold">Built for accessibility</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Large tap targets, high-contrast colors, and elder-friendly typography on every screen.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emergency/10 text-emergency">
              <Siren className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-semibold">Real emergencies, real fast</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                One-tap SOS finds the nearest hospital and police, and notifies your emergency contact.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
