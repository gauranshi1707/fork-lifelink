import { Zap } from "lucide-react";
import { useUserPoints } from "@/hooks/useUserPoints";

/**
 * Points badge for display in header/navigation
 * Shows current points balance
 */
export const PointsBadge = () => {
  const { points, loading } = useUserPoints();

  if (!points) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-200">
      <Zap className="h-4 w-4 text-yellow-600" />
      <span className="text-sm font-medium text-yellow-900">
        {loading ? "..." : points.balance}
      </span>
    </div>
  );
};

/**
 * Larger points display for dashboard/profile pages
 */
export const PointsDisplay = () => {
  const { points, loading } = useUserPoints();

  if (!points) {
    return null;
  }

  return (
    <div className="inline-flex flex-col items-center gap-1 p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200">
      <Zap className="h-6 w-6 text-yellow-600" />
      <div className="text-center">
        <div className="text-3xl font-bold text-yellow-900">
          {loading ? "..." : points.balance}
        </div>
        <div className="text-sm text-yellow-700">Points</div>
      </div>
    </div>
  );
};
