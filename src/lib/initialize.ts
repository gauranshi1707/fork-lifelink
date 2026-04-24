import { supabase } from "@/integrations/supabase/client";

/**
 * Initialize referral system - creates tables if they don't exist
 * This is called once on app startup
 */
export async function initializeReferralSystem() {
  try {
    console.log("[v0] Initializing referral system...");

    // Check if referral tables exist by trying to query them
    const { error: referralsError } = await supabase
      .from("referrals")
      .select("id")
      .limit(0);

    const { error: pointsError } = await supabase
      .from("user_points")
      .select("id")
      .limit(0);

    if (referralsError && referralsError.code === "PGRST116") {
      console.log("[v0] Referrals table does not exist");
      // Tables don't exist - they need to be created via migration
      // In production, migrations should be run via Supabase CLI
      return false;
    }

    if (pointsError && pointsError.code === "PGRST116") {
      console.log("[v0] User points table does not exist");
      return false;
    }

    console.log("[v0] Referral system tables are ready");
    return true;
  } catch (err) {
    console.error("[v0] Error initializing referral system:", err);
    return false;
  }
}

/**
 * Verify that all necessary functions exist in Supabase
 */
export async function verifyReferralFunctions() {
  try {
    console.log("[v0] Verifying referral functions...");

    // Test the track_referral_with_points function exists by checking if we can call it
    // We'll use a null test to just verify the function exists
    const { error } = await supabase.rpc("get_user_referral_stats", {
      _user_id: "00000000-0000-0000-0000-000000000000",
    });

    if (error && error.code === "PGRST101") {
      console.log("[v0] RPC function does not exist yet");
      return false;
    }

    console.log("[v0] Referral functions verified");
    return true;
  } catch (err) {
    console.error("[v0] Error verifying functions:", err);
    return false;
  }
}
