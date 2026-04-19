/**
 * Overpass API client for finding nearby places (hospitals, police, pharmacies).
 * Free, no API key. Uses OpenStreetMap data.
 *
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

export type PlaceCategory = "hospital" | "police" | "pharmacy";

export interface NearbyPlace {
  id: string;
  category: PlaceCategory;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  phone?: string;
  address?: string;
  emergency?: boolean;
  open24_7?: boolean;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Haversine distance in km */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function buildQuery(lat: number, lon: number, radiusMeters: number, categories: PlaceCategory[]): string {
  const filters: string[] = [];
  for (const cat of categories) {
    if (cat === "hospital") {
      filters.push(`node["amenity"="hospital"](around:${radiusMeters},${lat},${lon});`);
      filters.push(`way["amenity"="hospital"](around:${radiusMeters},${lat},${lon});`);
      filters.push(`relation["amenity"="hospital"](around:${radiusMeters},${lat},${lon});`);
      filters.push(`node["healthcare"="hospital"](around:${radiusMeters},${lat},${lon});`);
      filters.push(`way["healthcare"="hospital"](around:${radiusMeters},${lat},${lon});`);
    } else if (cat === "police") {
      filters.push(`node["amenity"="police"](around:${radiusMeters},${lat},${lon});`);
      filters.push(`way["amenity"="police"](around:${radiusMeters},${lat},${lon});`);
    } else if (cat === "pharmacy") {
      filters.push(`node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon});`);
      filters.push(`way["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon});`);
    }
  }
  return `[out:json][timeout:25];(${filters.join("")});out center tags;`;
}

function elementToPlace(el: OverpassElement, originLat: number, originLon: number): NearbyPlace | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const tags = el.tags ?? {};
  const amenity = tags["amenity"] ?? tags["healthcare"];
  let category: PlaceCategory;
  if (amenity === "hospital" || tags["healthcare"] === "hospital") category = "hospital";
  else if (amenity === "police") category = "police";
  else if (amenity === "pharmacy") category = "pharmacy";
  else return null;

  const name =
    tags["name"] ??
    tags["name:en"] ??
    tags["operator"] ??
    (category === "hospital" ? "Unnamed hospital" : category === "police" ? "Police station" : "Pharmacy");

  const phone = tags["phone"] ?? tags["contact:phone"];
  const addressParts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter(Boolean);
  const address = addressParts.length ? addressParts.join(" ") : tags["addr:full"];

  const emergency = tags["emergency"] === "yes" || tags["healthcare:emergency"] === "yes";
  const open24_7 = (tags["opening_hours"] ?? "").toLowerCase().includes("24/7");

  return {
    id: `${el.type}/${el.id}`,
    category,
    name,
    lat,
    lon,
    distanceKm: haversineKm(originLat, originLon, lat, lon),
    phone,
    address,
    emergency,
    open24_7,
  };
}

export async function findNearbyPlaces(
  lat: number,
  lon: number,
  radiusKm: number,
  categories: PlaceCategory[],
  signal?: AbortSignal,
): Promise<NearbyPlace[]> {
  const radiusMeters = Math.round(radiusKm * 1000);
  const body = "data=" + encodeURIComponent(buildQuery(lat, lon, radiusMeters, categories));

  let lastError: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal,
      });
      if (!resp.ok) {
        lastError = new Error(`Overpass ${resp.status}`);
        continue;
      }
      const data = (await resp.json()) as { elements: OverpassElement[] };
      const seen = new Set<string>();
      const places: NearbyPlace[] = [];
      for (const el of data.elements ?? []) {
        const p = elementToPlace(el, lat, lon);
        if (!p) continue;
        // Deduplicate (way + node sometimes overlap)
        const key = `${p.category}:${p.name}:${p.lat.toFixed(4)}:${p.lon.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        places.push(p);
      }
      places.sort((a, b) => a.distanceKm - b.distanceKm);
      return places;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
      lastError = err;
      continue;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All Overpass endpoints failed");
}

/**
 * Reverse geocode using Nominatim (OpenStreetMap).
 * Used to detect country code so we can show the right emergency number.
 */
export interface ReverseGeocode {
  countryCode?: string;
  city?: string;
  displayName?: string;
}

export async function reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<ReverseGeocode> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!resp.ok) return {};
    const data = await resp.json();
    return {
      countryCode: (data.address?.country_code as string | undefined)?.toUpperCase(),
      city: data.address?.city ?? data.address?.town ?? data.address?.village ?? data.address?.county,
      displayName: data.display_name,
    };
  } catch {
    return {};
  }
}
