import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserPointsRecord } from "@/lib/points";

interface UserPoints {
  id: string;
  userId: string;
  balance: number;
  pointsEarned: number;
  pointsRedeemed: number;
  referralCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch and manage user points
 */
export const useUserPoints = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPoints(null);
      setLoading(false);
      return;
    }

    const fetchPoints = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getUserPointsRecord(user.id);

        if (data) {
          setPoints({
            id: data.id,
            userId: data.user_id,
            balance: data.balance,
            pointsEarned: data.points_earned,
            pointsRedeemed: data.points_redeemed,
            referralCount: data.referral_count,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        } else {
          setPoints(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setPoints(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, [user]);

  return { points, loading, error };
};
