import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, MapPin, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { TIER_LABELS } from "@/lib/constants";

type BusinessCardProps = {
  business: {
    id: string;
    name: string;
    description: string | null;
    city: string;
    verification_status: string;
    subscription_tier: string;
    logo_url: string | null;
  };
};

export const BusinessCard = ({ business }: BusinessCardProps) => {
  const navigate = useNavigate();
  const isUltimate = business.subscription_tier === "pro";
  const isPaidTier = business.subscription_tier !== "free";
  const isVerified = business.verification_status === "approved";

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer card-hover active-scale",
        isUltimate && "ring-2 ring-primary/30"
      )}
      onClick={() => navigate(`/business/${business.id}`)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold text-secondary-foreground shrink-0">
            {business.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-semibold text-sm truncate">{business.name}</h3>
              {isVerified && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
              {isUltimate && (
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">
                  <Crown className="h-2.5 w-2.5 mr-0.5 fill-current" />
                  ULTIMATE
                </Badge>
              )}
              {business.subscription_tier === "basic" && (
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">
                  <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                  PRO
                </Badge>
              )}
            </div>
            {business.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{business.description}</p>
            )}
            <div className="flex items-center gap-1 mt-1.5 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="text-[11px]">{business.city}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
