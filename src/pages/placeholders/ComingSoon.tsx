import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: string;
}

export const ComingSoon = ({ title, description, icon: Icon, accent = "bg-primary" }: ComingSoonProps) => {
  return (
    <section className="container py-20">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border/60 bg-card p-10 text-center shadow-card">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${accent} text-primary-foreground shadow-glow`}>
          <Icon className="h-8 w-8" strokeWidth={2.25} />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{description}</p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Coming next in the build
        </span>
        <div className="mt-8">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
