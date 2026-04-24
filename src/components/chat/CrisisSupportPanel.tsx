import { Phone, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmergencyContact {
  region: string;
  number: string;
  href: string;
}

const EMERGENCY_NUMBERS: EmergencyContact[] = [
  { region: "United States", number: "911", href: "tel:911" },
  { region: "European Union", number: "112", href: "tel:112" },
  { region: "United Kingdom", number: "999", href: "tel:999" },
  { region: "India", number: "112", href: "tel:112" },
  { region: "Australia", number: "000", href: "tel:000" },
  { region: "Canada", number: "911", href: "tel:911" },
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
        "relative overflow-hidden rounded-2xl border-2 border-destructive/40",
        "bg-gradient-to-br from-destructive/10 to-destructive/5 shadow-elevated animate-float-up",
      )}
    >
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold leading-tight text-foreground">
                Medical Emergency Warning
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                If you&apos;re experiencing a medical emergency, <strong className="text-foreground">call emergency services immediately</strong>.
                Do not wait for online guidance.
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="Hide emergency info panel"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Emergency Numbers by Region
          </p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {EMERGENCY_NUMBERS.map((contact) => (
              <li key={contact.region}>
                <a
                  href={contact.href}
                  className="flex items-center justify-between gap-2 rounded-xl bg-card border border-border px-3 py-2.5 shadow-soft transition-base hover:border-destructive/40 hover:bg-destructive/5"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{contact.region}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-sm font-bold text-destructive">
                    <Phone className="h-3.5 w-3.5" />
                    {contact.number}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-foreground font-medium">When to call emergency services:</p>
          <ul className="mt-2 text-xs text-muted-foreground space-y-1">
            <li>- Chest pain or difficulty breathing</li>
            <li>- Signs of stroke (face drooping, arm weakness, speech difficulty)</li>
            <li>- Severe bleeding or major injuries</li>
            <li>- Loss of consciousness or seizures</li>
            <li>- Severe allergic reactions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
