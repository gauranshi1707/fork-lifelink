import { supabase } from "@/integrations/supabase/client";

const REF_KEY = "lifelink:ref:v1";

export const captureReferralFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (code && /^[A-Z0-9]{4,12}$/i.test(code)) {
      localStorage.setItem(REF_KEY, code.toUpperCase());
    }
  } catch {
    /* noop */
  }
};

export const getStoredReferralCode = () => {
  try {
    return localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
};

export const clearStoredReferralCode = () => {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    /* noop */
  }
};

export const buildReferralLink = (code: string) =>
  `${window.location.origin}/auth?mode=signup&ref=${encodeURIComponent(code)}`;

/**
 * Process referral when new user completes signup
 * Awards points to both referrer and referred user
 */
export const processReferral = async (userId: string) => {
  try {
    const referralCode = getStoredReferralCode();
    if (!referralCode) {
      console.log("[v0] No referral code found");
      // Award new user the signup bonus even without referral
      await supabase.rpc("award_referred_user_points", {
        _referred_user_id: userId,
      });
      clearStoredReferralCode();
      return { success: true, type: "new_user_bonus" };
    }

    console.log("[v0] Processing referral with code:", referralCode);

    // Use the track_referral_with_points RPC to handle everything atomically
    const { data, error } = await supabase.rpc("track_referral_with_points", {
      _referrer_code: referralCode,
      _referred_user_id: userId,
    });

    if (error) {
      console.error("[v0] Referral processing error:", error);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0) {
      const result = data[0];
      clearStoredReferralCode();
      console.log("[v0] Referral processed successfully", result);
      return {
        success: result.success,
        referral_id: result.referral_id,
        referrer_id: result.referrer_id,
        type: "referred_user",
      };
    }

    clearStoredReferralCode();
    return { success: false, error: "No response from referral processing" };
  } catch (err) {
    console.error("[v0] Exception in processReferral:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

/**
 * Get user's referral statistics and points
 */
export const getUserReferralStats = async (userId: string) => {
  try {
    const { data, error } = await supabase.rpc("get_user_referral_stats", {
      _user_id: userId,
    });

    if (error) {
      console.error("[v0] Error fetching referral stats:", error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  } catch (err) {
    console.error("[v0] Exception in getUserReferralStats:", err);
    return null;
  }
};

/**
 * Fetch user's points balance from database
 */
export const getUserPoints = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is acceptable
      console.error("[v0] Error fetching user points:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[v0] Exception in getUserPoints:", err);
    return null;
  }
};

/**
 * Get referral code for current user
 */
export const getUserReferralCode = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("[v0] Error fetching referral code:", error);
      return null;
    }

    return data?.referral_code || null;
  } catch (err) {
    console.error("[v0] Exception in getUserReferralCode:", err);
    return null;
  }
};
