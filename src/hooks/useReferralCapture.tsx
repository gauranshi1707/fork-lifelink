import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { captureReferralFromUrl, processReferral } from "@/lib/referral";

/**
 * Captures ?ref= from the URL into localStorage on mount, and once the user
 * is signed in, processes the referral via the secure RPC (which awards points to
 * both referrer and referred user) and clears storage.
 */
export const useReferralCapture = () => {
  const { user, loading } = useAuth();
  const claimed = useRef(false);

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  useEffect(() => {
    if (loading || !user || claimed.current) return;
    claimed.current = true;
    (async () => {
      const result = await processReferral(user.id);
      console.log("[v0] Referral processing result:", result);
      if (!result.success) {
        claimed.current = false;
      }
    })();
  }, [user, loading]);
};
