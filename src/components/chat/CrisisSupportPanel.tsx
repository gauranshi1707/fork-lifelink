import { Phone, ExternalLink, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Helpline {
  region: string;
  name: string;
  phone: string;
  href?: string;
  hours?: string;
}

const HELPLINES: Helpline[] = [
  {
    region: "United States",
    name: "988 Suicide & Crisis Lifeline",
    phone: "988",
    href: "tel:988",
    hours: "24/7",
  },
  {
    region: "United Kingdom & Ireland",
    name: "Samaritans",
    phone: "116 123",
    href: "tel:116123",
    hours: "24/7, free",
  },
  {
    region: "India",
    name: "iCall Psychosocial Helpline",
    phone: "9152987821",
    href: "tel:+919152987821",
    hours: "Mon–Sat, 8am–10pm",
  },
  {
    region: "Canada",
    name: "Talk Suicide Canada",
    phone: "1-833-456-4566",
    href: "tel:18334564566",
    hours: "24/7",
  },
  {
    region: "Australia",
    name: "Lifeline",
    phone: "13 11 14",
    href: "tel:131114",
    hours: "24/7",
  },
  {
    region: "International directory",
    name: "Find A Helpline",
    phone: "findahelpline.com",
    href: "https://findahelpline.com",
  },
];

interface Props {
  visible: boolean;
  onDismiss?: () => void;
}

export const CrisisSupportPanel = ({ visible, onDismiss }: Props) => {
  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-crisis/40",
        "bg-gradient-crisis text-crisis-foreground shadow-elevated animate-float-up",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10" />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/25 backdrop-blur">
              <ShieldAlert className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold leading-tight">You don't have to face this alone</h2>
              <p className="mt-1 text-sm leading-relaxed opacity-95">
                Trained people are ready to listen <strong>right now</strong>, free and confidentially. Please reach
                out — your life matters.
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="Hide crisis support panel"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {HELPLINES.map((h) => (
            <li key={h.region}>
              <a
                href={h.href}
                target={h.href?.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl bg-white/95 px-3 py-2.5 text-crisis-foreground shadow-soft transition-base hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide opacity-70">{h.region}</p>
                  <p className="truncate text-sm font-semibold">{h.name}</p>
                  {h.hours && <p className="text-xs opacity-70">{h.hours}</p>}
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-crisis/15 px-2.5 py-1 text-sm font-bold text-crisis">
                  {h.href?.startsWith("http") ? <ExternalLink className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                  {h.phone}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs opacity-90">
          If you're in immediate danger, call your local emergency number now (911 in the US, 112 in EU, 999 in UK,
          112 in India).
        </p>
        <div className="mt-3">
          <Button asChild size="sm" variant="secondary" className="rounded-full bg-white text-crisis hover:bg-white/90">
            <a href="https://findahelpline.com" target="_blank" rel="noreferrer">
              Find a helpline in your country
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};
