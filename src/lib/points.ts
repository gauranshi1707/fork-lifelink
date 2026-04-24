import { supabase } from "@/integrations/supabase/client";

const POINTS_REFERRER = 10; // Points awarded to referrer
const POINTS_REFERRED = 5; // Points awarded to referred user

/**
 * Get current user's points balance
 */
export const getUserPointsBalance = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching points balance:", error);
      return null;
    }

    return data?.balance ?? 0;
  } catch (err) {
    console.error("[v0] Exception in getUserPointsBalance:", err);
    return null;
  }
};

/**
 * Get complete user points record
 */
export const getUserPointsRecord = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching points record:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[v0] Exception in getUserPointsRecord:", err);
    return null;
  }
};

/**
 * Get leaderboard - users with most points
 */
export const getPointsLeaderboard = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from("user_points")
      .select(
        `
        balance,
        referral_count,
        points_earned,
        user_id,
        profiles(display_name)
      `
      )
      .order("balance", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[v0] Error fetching leaderboard:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[v0] Exception in getPointsLeaderboard:", err);
    return [];
  }
};

/**
 * Format points for display
 */
export const formatPoints = (points: number | null): string => {
  if (points === null) return "0";
  return points.toLocaleString();
};

/**
 * Get points value constants
 */
export const POINTS_VALUES = {
  REFERRER: POINTS_REFERRER,
  REFERRED: POINTS_REFERRED,
};

/**
 * Subscribe to user's points changes in real-time
 */
export const subscribeToPointsChanges = (
  userId: string,
  callback: (data: any) => void
) => {
  const subscription = supabase
    .channel(`user_points:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_points",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[v0] Points update:", payload);
        callback(payload.new);
      }
    )
    .subscribe();

  return subscription;
};
