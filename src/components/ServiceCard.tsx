import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { useNavigate } from "react-router-dom";

type ServiceCardProps = {
  service: {
    id: string;
    title: string;
    description: string | null;
    base_price: number;
    category: string;
    business?: {
      id: string;
      name: string;
      city: string;
      verification_status: string;
      subscription_tier: string;
      logo_url: string | null;
    };
  };
};

export const ServiceCard = ({ service }: ServiceCardProps) => {
  const navigate = useNavigate();
  const cat = CATEGORIES.find((c) => c.value === service.category);
  const biz = service.business;
  const isUltimate = biz?.subscription_tier === "pro";
  const isPaidTier = biz?.subscription_tier !== "free";
  const isVerified = biz?.verification_status === "approved";

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer card-hover active-scale border",
        isUltimate && "ring-2 ring-primary/30"
      )}
      onClick={() => biz && navigate(`/business/${biz.id}`)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {cat && (
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", cat.color)}>
                  <cat.icon className="h-3 w-3" />
                  {cat.label}
                </span>
              )}
              {isUltimate && (
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">
                  <Crown className="h-2.5 w-2.5 mr-0.5 fill-current" />
                  ULTIMATE
                </Badge>
              )}
              {biz?.subscription_tier === "basic" && (
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">
                  <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                  PRO
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm leading-tight truncate">{service.title}</h3>
            {service.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-primary">
              ${Number(service.base_price).toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground">base price</p>
          </div>
        </div>
        {biz && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground">
              {biz.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium truncate">{biz.name}</span>
                {isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
              </div>
              <p className="text-[10px] text-muted-foreground">{biz.city}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
