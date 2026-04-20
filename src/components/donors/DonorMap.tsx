import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NearbyDonor } from "@/lib/donors";

interface Props {
  center: { lat: number; lon: number };
  donors: NearbyDonor[];
  radiusKm: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

function donorIcon(selected: boolean): L.DivIcon {
  const size = selected ? 40 : 32;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:hsl(0 78% 54%);
      border:3px solid white;border-radius:50%;
      box-shadow:0 4px 12px rgba(0,0,0,.25);
      display:grid;place-items:center;
      font-size:${size * 0.5}px;color:white;font-weight:700;
      transform:translate(-50%,-50%);
    ">🩸</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [0, 0],
  });
}

function userIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="position:relative;width:24px;height:24px;transform:translate(-50%,-50%)">
      <div style="position:absolute;inset:-12px;border-radius:50%;background:hsl(174 62% 36% / .25);animation:dpulse 2s ease-out infinite"></div>
      <div style="position:absolute;inset:0;border-radius:50%;background:hsl(174 62% 36%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>
    </div>
    <style>@keyframes dpulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(2);opacity:0}}</style>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [0, 0],
  });
}

export const DonorMap = ({ center, donors, radiusKm, selectedId, onSelect }: Props) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lon],
      zoom: 12,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.marker([center.lat, center.lon], { icon: userIcon(), zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup("Search center");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([center.lat, center.lon], mapRef.current.getZoom());
  }, [center.lat, center.lon]);

  // radius circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (circleRef.current) circleRef.current.remove();
    circleRef.current = L.circle([center.lat, center.lon], {
      radius: radiusKm * 1000,
      color: "hsl(174 62% 36%)",
      weight: 1.5,
      fillColor: "hsl(174 62% 36%)",
      fillOpacity: 0.06,
    }).addTo(map);
  }, [center.lat, center.lon, radiusKm]);

  const donorsKey = useMemo(() => donors.map((d) => d.donor_id).join("|"), [donors]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const [id, marker] of markersRef.current) {
      if (!donors.find((d) => d.donor_id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
    for (const d of donors) {
      let marker = markersRef.current.get(d.donor_id);
      const icon = donorIcon(d.donor_id === selectedId);
      if (!marker) {
        marker = L.marker([d.latitude, d.longitude], { icon }).addTo(map);
        marker.bindPopup(
          `<strong>${d.blood_group}</strong> donor<br/>${escapeHtml(d.city)}<br/>${d.distance_km.toFixed(1)} km away`,
        );
        marker.on("click", () => onSelect?.(d.donor_id));
        markersRef.current.set(d.donor_id, marker);
      } else {
        marker.setIcon(icon);
        marker.setLatLng([d.latitude, d.longitude]);
      }
    }
    if (donors.length > 0) {
      const bounds = L.latLngBounds([
        [center.lat, center.lon],
        ...donors.slice(0, 12).map((d) => [d.latitude, d.longitude] as [number, number]),
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donorsKey]);

  useEffect(() => {
    if (!mapRef.current) return;
    for (const [id, marker] of markersRef.current) {
      marker.setIcon(donorIcon(id === selectedId));
    }
    if (selectedId) {
      const marker = markersRef.current.get(selectedId);
      if (marker) {
        mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 14), { animate: true });
        marker.openPopup();
      }
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="h-[460px] w-full overflow-hidden rounded-3xl border border-border/60 shadow-card"
      role="application"
      aria-label="Map of nearby blood donors"
    />
  );
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
