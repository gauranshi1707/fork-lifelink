import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { captureReferralFromUrl, clearStoredReferralCode, getStoredReferralCode } from "@/lib/referral";

/**
 * Captures ?ref= from the URL into localStorage on mount, and once the user
 * is signed in, claims the referral via the secure RPC and clears storage.
 */
export const useReferralCapture = () => {
  const { user, loading } = useAuth();
  const claimed = useRef(false);

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  useEffect(() => {
    if (loading || !user || claimed.current) return;
    const code = getStoredReferralCode();
    if (!code) return;
    claimed.current = true;
    (async () => {
      const { error } = await supabase.rpc("claim_referral", { _code: code });
      if (!error) clearStoredReferralCode();
      else claimed.current = false;
    })();
  }, [user, loading]);
};
