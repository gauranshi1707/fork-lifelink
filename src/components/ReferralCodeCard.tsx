import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildReferralLink } from "@/lib/referral";

interface ReferralCodeCardProps {
  code: string | null;
  isLoading?: boolean;
}

export const ReferralCodeCard = ({ code, isLoading = false }: ReferralCodeCardProps) => {
  const [copied, setCopied] = useState(false);

  const referralLink = code ? buildReferralLink(code) : null;

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join LifeLink",
          text: "Earn 5 bonus points when you sign up with my referral code!",
          url: referralLink,
        });
      } catch (err) {
        console.log("[v0] Share cancelled");
      }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Referral Code</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!code) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Referral Code</CardTitle>
          <CardDescription>Unable to load your referral code</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Referral Code</CardTitle>
        <CardDescription>Share this code to earn points when friends sign up</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Code Display */}
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <code className="flex-1 text-lg font-mono font-bold text-center">
            {code}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            className="h-8 w-8 p-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCopyLink}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>• You earn 10 points for each successful referral</p>
          <p>• They earn 5 bonus points when they sign up</p>
        </div>
      </CardContent>
    </Card>
  );
};
