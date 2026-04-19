import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyPlace } from "@/lib/overpass";

interface Props {
  center: { lat: number; lon: number };
  places: NearbyPlace[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const ICONS: Record<NearbyPlace["category"], string> = {
  hospital: "#dc2626",
  police: "#1d4ed8",
  pharmacy: "#16a34a",
};

const EMOJI: Record<NearbyPlace["category"], string> = {
  hospital: "🏥",
  police: "🚓",
  pharmacy: "💊",
};

function makeIcon(category: NearbyPlace["category"], selected: boolean): L.DivIcon {
  const color = ICONS[category];
  const size = selected ? 40 : 32;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 4px 12px rgba(0,0,0,.25);
      display:grid;place-items:center;
      font-size:${size * 0.5}px;
      transform:translate(-50%,-50%);
    ">${EMOJI[category]}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [0, 0],
  });
}

function makeUserIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="position:relative;width:24px;height:24px;transform:translate(-50%,-50%)">
      <div style="position:absolute;inset:-12px;border-radius:50%;background:hsl(174 62% 36% / .25);animation:pulse 2s ease-out infinite"></div>
      <div style="position:absolute;inset:0;border-radius:50%;background:hsl(174 62% 36%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>
    </div>
    <style>@keyframes pulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2);opacity:0}}</style>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [0, 0],
  });
}

export const SosMap = ({ center, places, selectedId, onSelect }: Props) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lon],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.marker([center.lat, center.lon], { icon: makeUserIcon(), zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup("You are here");

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when origin changes (e.g. manual relocation)
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([center.lat, center.lon], mapRef.current.getZoom());
  }, [center.lat, center.lon]);

  // Sync place markers
  const placesKey = useMemo(() => places.map((p) => p.id).join("|"), [places]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old
    for (const [id, marker] of markersRef.current) {
      if (!places.find((p) => p.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
    // Add/update
    for (const p of places) {
      let marker = markersRef.current.get(p.id);
      const icon = makeIcon(p.category, p.id === selectedId);
      if (!marker) {
        marker = L.marker([p.lat, p.lon], { icon }).addTo(map);
        marker.bindPopup(
          `<strong>${escapeHtml(p.name)}</strong><br/>${p.distanceKm.toFixed(2)} km away${
            p.phone ? `<br/>📞 ${escapeHtml(p.phone)}` : ""
          }`,
        );
        marker.on("click", () => onSelect?.(p.id));
        markersRef.current.set(p.id, marker);
      } else {
        marker.setIcon(icon);
        marker.setLatLng([p.lat, p.lon]);
      }
    }

    // Fit bounds (origin + first 8 places) on initial population
    if (places.length > 0) {
      const bounds = L.latLngBounds([
        [center.lat, center.lon],
        ...places.slice(0, 8).map((p) => [p.lat, p.lon] as [number, number]),
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesKey]);

  // Highlight selected
  useEffect(() => {
    if (!mapRef.current) return;
    for (const [id, marker] of markersRef.current) {
      const place = places.find((p) => p.id === id);
      if (!place) continue;
      marker.setIcon(makeIcon(place.category, id === selectedId));
    }
    if (selectedId) {
      const marker = markersRef.current.get(selectedId);
      if (marker) {
        mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 15), { animate: true });
        marker.openPopup();
      }
    }
  }, [selectedId, places]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-3xl border border-border/60 shadow-card"
      role="application"
      aria-label="Map of nearby emergency services"
    />
  );
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
