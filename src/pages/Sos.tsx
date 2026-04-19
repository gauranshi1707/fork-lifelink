import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Crosshair,
  Hospital,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Shield,
  Siren,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { findNearbyPlaces, reverseGeocode, type NearbyPlace, type PlaceCategory } from "@/lib/overpass";
import { getEmergencyNumbers, type EmergencyNumbers } from "@/lib/emergencyNumbers";
import { SosMap } from "@/components/sos/SosMap";

type Status = "idle" | "locating" | "loading" | "ready" | "error";

const RADIUS_KM = 10;

const Sos = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [filter, setFilter] = useState<"all" | PlaceCategory>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emergency, setEmergency] = useState<EmergencyNumbers>(getEmergencyNumbers());
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const loadPlaces = useCallback(async (lat: number, lon: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setErrorMsg("");
    try {
      const [results, geo] = await Promise.all([
        findNearbyPlaces(lat, lon, RADIUS_KM, ["hospital", "police", "pharmacy"], controller.signal),
        reverseGeocode(lat, lon, controller.signal),
      ]);
      setPlaces(results);
      setEmergency(getEmergencyNumbers(geo.countryCode));
      setStatus("ready");
      if (results.length === 0) {
        toast.info("No services found within 10 km — try a wider area or check your location.");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      console.error(err);
      setStatus("error");
      setErrorMsg("We couldn't reach the directory service. Please check your connection and try again.");
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setErrorMsg("Your browser doesn't support location services. Please enter coordinates manually below.");
      return;
    }
    setStatus("locating");
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setOrigin(next);
        setAccuracy(pos.coords.accuracy ?? null);
        loadPlaces(next.lat, next.lon);
      },
      (err) => {
        setStatus("error");
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg(
            "Location permission was denied. Please allow location access in your browser, or enter coordinates manually below.",
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrorMsg("Your location is currently unavailable. Please try again or enter coordinates manually.");
        } else if (err.code === err.TIMEOUT) {
          setErrorMsg("Locating took too long. Please try again.");
        } else {
          setErrorMsg("We couldn't determine your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, [loadPlaces]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const m = manualValue.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!m) {
      toast.error("Enter coordinates as 'latitude, longitude' (e.g. 40.7128, -74.0060)");
      return;
    }
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      toast.error("Coordinates out of range.");
      return;
    }
    setOrigin({ lat, lon });
    setAccuracy(null);
    setManualOpen(false);
    loadPlaces(lat, lon);
  };

  // Auto-request location on first mount
  useEffect(() => {
    requestLocation();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPlaces = useMemo(() => {
    if (filter === "all") return places;
    return places.filter((p) => p.category === filter);
  }, [places, filter]);

  const counts = useMemo(
    () => ({
      hospital: places.filter((p) => p.category === "hospital").length,
      police: places.filter((p) => p.category === "police").length,
      pharmacy: places.filter((p) => p.category === "pharmacy").length,
    }),
    [places],
  );

  return (
    <section className="container max-w-6xl py-6 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emergency/30 bg-emergency/10 px-3 py-1 text-xs font-medium text-emergency">
            <Siren className="h-3.5 w-3.5" />
            Emergency dashboard
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Help, fast — wherever you are
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            One tap finds the nearest 24/7 hospitals, police stations, and pharmacies using your live location.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <a
            href={`tel:${(emergency.general ?? emergency.police ?? "112").replace(/\s/g, "")}`}
            className={cn(
              "inline-flex items-center gap-3 rounded-full px-5 py-3",
              "bg-gradient-emergency text-emergency-foreground shadow-emergency",
              "transition-base hover:scale-[1.02] active:scale-[0.99]",
            )}
            aria-label={`Call emergency services in ${emergency.country}`}
          >
            <Phone className="h-5 w-5" strokeWidth={2.5} />
            <div className="text-left leading-tight">
              <div className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                Call · {emergency.country}
              </div>
              <div className="font-display text-xl font-bold">
                {emergency.general ?? emergency.police ?? "112"}
              </div>
            </div>
          </a>
          {(emergency.police || emergency.ambulance || emergency.fire) && (
            <div className="flex flex-wrap justify-end gap-1.5 text-xs">
              {emergency.police && (
                <a
                  href={`tel:${emergency.police.replace(/[^\d+]/g, "")}`}
                  className="rounded-full border border-border bg-card px-2.5 py-1 hover:bg-muted"
                >
                  Police: <strong>{emergency.police}</strong>
                </a>
              )}
              {emergency.ambulance && (
                <a
                  href={`tel:${emergency.ambulance.replace(/[^\d+]/g, "")}`}
                  className="rounded-full border border-border bg-card px-2.5 py-1 hover:bg-muted"
                >
                  Ambulance: <strong>{emergency.ambulance}</strong>
                </a>
              )}
              {emergency.fire && (
                <a
                  href={`tel:${emergency.fire.replace(/[^\d+]/g, "")}`}
                  className="rounded-full border border-border bg-card px-2.5 py-1 hover:bg-muted"
                >
                  Fire: <strong>{emergency.fire}</strong>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Location bar */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-soft">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          {origin ? (
            <>
              <p className="text-sm font-medium">
                {emergency.country !== "International" ? emergency.country : "Your location"}
                {accuracy != null && (
                  <span className="ml-2 text-xs text-muted-foreground">±{Math.round(accuracy)} m</span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {origin.lat.toFixed(5)}, {origin.lon.toFixed(5)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {status === "locating" ? "Finding your location…" : "Location not set."}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={requestLocation}
          disabled={status === "locating" || status === "loading"}
        >
          {status === "locating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          Use my location
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => setManualOpen((v) => !v)}
          aria-expanded={manualOpen}
        >
          Enter manually
        </Button>
        {origin && status !== "locating" && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => loadPlaces(origin.lat, origin.lon)}
            disabled={status === "loading"}
            aria-label="Refresh nearby services"
          >
            <RefreshCw className={cn("h-4 w-4", status === "loading" && "animate-spin")} />
          </Button>
        )}
      </div>

      {manualOpen && (
        <form
          onSubmit={submitManual}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-soft animate-float-up"
        >
          <div className="flex-1 min-w-[240px]">
            <Label htmlFor="manual-coords" className="text-xs">
              Enter coordinates (latitude, longitude)
            </Label>
            <Input
              id="manual-coords"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="e.g. 40.7128, -74.0060"
              className="mt-1"
            />
          </div>
          <Button type="submit" className="rounded-full bg-gradient-primary text-primary-foreground">
            Search here
          </Button>
        </form>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{errorMsg || "Something went wrong."}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You can still call your local emergency number from the button above.
            </p>
          </div>
          <Button size="sm" variant="outline" className="rounded-full" onClick={requestLocation}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      {origin && status !== "error" && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all", label: "All", icon: Siren, count: places.length },
              { key: "hospital", label: "Hospitals", icon: Hospital, count: counts.hospital },
              { key: "police", label: "Police", icon: Shield, count: counts.police },
              { key: "pharmacy", label: "Pharmacies", icon: Phone, count: counts.pharmacy },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-base",
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              <f.icon className="h-4 w-4" />
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  filter === f.key ? "bg-primary-foreground/25" : "bg-muted",
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Map + List */}
      {origin && status !== "error" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SosMap
              center={origin}
              places={filteredPlaces}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
            />
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-border/60 bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <h2 className="font-semibold">
                  {status === "loading" ? "Searching nearby…" : `${filteredPlaces.length} results`}
                </h2>
                <span className="text-xs text-muted-foreground">within {RADIUS_KM} km</span>
              </div>

              {status === "loading" ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredPlaces.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No matches in this area.
                </div>
              ) : (
                <ul className="max-h-[420px] divide-y divide-border/60 overflow-y-auto">
                  {filteredPlaces.map((p) => (
                    <PlaceItem
                      key={p.id}
                      place={p}
                      origin={origin}
                      selected={selectedId === p.id}
                      onSelect={() => setSelectedId(p.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const CATEGORY_STYLE: Record<NearbyPlace["category"], { label: string; cls: string; icon: typeof Hospital }> = {
  hospital: { label: "Hospital", cls: "bg-emergency/10 text-emergency", icon: Hospital },
  police: { label: "Police", cls: "bg-blue-500/10 text-blue-600", icon: Shield },
  pharmacy: { label: "Pharmacy", cls: "bg-success/10 text-success", icon: Phone },
};

const PlaceItem = ({
  place,
  origin,
  selected,
  onSelect,
}: {
  place: NearbyPlace;
  origin: { lat: number; lon: number };
  selected: boolean;
  onSelect: () => void;
}) => {
  const style = CATEGORY_STYLE[place.category];
  const directionsUrl = `https://www.openstreetmap.org/directions?from=${origin.lat},${origin.lon}&to=${place.lat},${place.lon}`;

  return (
    <li
      className={cn(
        "cursor-pointer px-4 py-3 transition-base hover:bg-muted/50",
        selected && "bg-primary-soft",
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", style.cls)}>
          <style.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-medium">{place.name}</p>
            <span className="shrink-0 text-xs font-semibold text-primary">
              {place.distanceKm < 1 ? `${Math.round(place.distanceKm * 1000)} m` : `${place.distanceKm.toFixed(2)} km`}
            </span>
          </div>
          {place.address && <p className="mt-0.5 truncate text-xs text-muted-foreground">{place.address}</p>}
          <div className="mt-1 flex flex-wrap gap-1">
            {place.open24_7 && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                24/7
              </span>
            )}
            {place.emergency && (
              <span className="rounded-full bg-emergency/15 px-2 py-0.5 text-[10px] font-semibold text-emergency">
                Emergency
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {place.phone && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <a href={`tel:${place.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone className="h-3 w-3" />
                  Call
                </a>
              </Button>
            )}
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-2.5 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <a href={directionsUrl} target="_blank" rel="noreferrer">
                <Navigation className="h-3 w-3" />
                Directions
              </a>
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
};

export default Sos;
