import { Link, useLocation } from "react-router-dom";
import { Siren } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Always-visible floating SOS button.
 * Hidden on the SOS page itself to avoid redundancy.
 */
export const SosFloatingButton = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/sos")) return null;

  return (
    <Link
      to="/sos"
      aria-label="Emergency SOS — find nearest help"
      className={cn(
        "fixed bottom-5 right-5 z-50 sos-pulse",
        "grid place-items-center rounded-full",
        "h-16 w-16 sm:h-[72px] sm:w-[72px]",
        "bg-gradient-emergency text-emergency-foreground shadow-emergency",
        "transition-smooth hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emergency/40",
      )}
    >
      <div className="flex flex-col items-center gap-0.5">
        <Siren className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} />
        <span className="text-[10px] font-bold uppercase tracking-wider">SOS</span>
      </div>
    </Link>
  );
};
