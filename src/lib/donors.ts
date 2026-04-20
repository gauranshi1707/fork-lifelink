import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type BloodGroup = Database["public"]["Enums"]["blood_group"];
export type UrgencyLevel = Database["public"]["Enums"]["urgency_level"];
export type ContactRequestStatus = Database["public"]["Enums"]["contact_request_status"];

export const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const URGENCY_LEVELS: UrgencyLevel[] = ["low", "normal", "high", "critical"];

/** Whose blood a donor can give to (recipient → list of donor groups). */
export const COMPATIBLE_DONORS: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

export interface NearbyDonor {
  donor_id: string;
  user_id: string;
  blood_group: BloodGroup;
  city: string;
  latitude: number;
  longitude: number;
  last_donation_date: string | null;
  note: string | null;
  distance_km: number;
}

export async function findNearbyDonors(
  bloodGroup: BloodGroup,
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<NearbyDonor[]> {
  const { data, error } = await supabase.rpc("donors_within_radius", {
    _blood_group: bloodGroup,
    _lat: lat,
    _lng: lng,
    _radius_km: radiusKm,
  });
  if (error) throw error;
  return (data ?? []) as NearbyDonor[];
}

export function eligibilityNote(lastDonation: string | null): string {
  if (!lastDonation) return "Eligible to donate";
  const d = new Date(lastDonation);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return `Last donated ${days} days ago`;
}
