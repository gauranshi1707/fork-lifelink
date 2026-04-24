import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserReferralStats, getUserReferralCode } from "@/lib/referral";

interface ReferralStats {
  totalReferrals: number;
  pointsBalance: number;
  pointsEarned: number;
  referralCode: string | null;
  referredUserCount: number;
}

/**
 * Hook to fetch and manage user referral statistics
 */
export const useReferralStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const [referralStats, referralCode] = await Promise.all([
          getUserReferralStats(user.id),
          getUserReferralCode(user.id),
        ]);

        if (referralStats) {
          setStats({
            totalReferrals: referralStats.total_referrals || 0,
            pointsBalance: referralStats.points_balance || 0,
            pointsEarned: referralStats.points_earned || 0,
            referralCode: referralCode,
            referredUserCount: referralStats.referred_user_count || 0,
          });
        } else {
          setStats(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, loading, error };
};
