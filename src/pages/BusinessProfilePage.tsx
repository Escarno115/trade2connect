import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCard } from "@/components/ServiceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, MapPin, Star, Crown, Clock } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ReviewsList } from "@/components/ReviewsList";
import { PortfolioGallery } from "@/components/PortfolioGallery";

const BusinessProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: business, isLoading } = useQuery({
    queryKey: ["business", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses_public")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: services } = useQuery({
    queryKey: ["business-services", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", id!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="pb-20">
        <div className="h-48 bg-secondary animate-pulse" />
        <div className="px-4 mt-4 space-y-3">
          <div className="h-6 w-48 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20">
        <div className="text-center">
          <p className="text-muted-foreground">Business not found</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-2">Go back</Button>
        </div>
      </div>
    );
  }

  const isUltimate = business.subscription_tier === "pro";
  const isPaidTier = business.subscription_tier !== "free";
  const isVerified = business.verification_status === "approved";

  return (
    <div className="pb-20">
      {/* Header */}
      <div className={cn("relative px-4 pt-12 pb-8", isUltimate ? "bg-primary" : isPaidTier ? "bg-primary/80" : "bg-foreground")}>
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-full bg-card/20 active-scale">
          <ArrowLeft className="h-5 w-5 text-primary-foreground" />
        </button>
        <div className="flex items-start gap-4 mt-4">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center text-2xl font-bold text-foreground shrink-0">
            {business.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-primary-foreground">{business.name}</h1>
              {isVerified && <CheckCircle2 className="h-5 w-5 text-green-300" />}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {isUltimate && (
                <Badge className="bg-card/20 text-primary-foreground border-0 text-[10px]">
                  <Crown className="h-2.5 w-2.5 mr-0.5 fill-current" /> ULTIMATE
                </Badge>
              )}
              {business.subscription_tier === "basic" && (
                <Badge className="bg-card/20 text-primary-foreground border-0 text-[10px]">
                  <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> PRO
                </Badge>
              )}
              <span className="flex items-center gap-1 text-xs text-primary-foreground/70">
                <MapPin className="h-3 w-3" />{business.city}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 mt-4">
        {business.description && (
          <p className="text-sm text-muted-foreground">{business.description}</p>
        )}

        {/* Office Address */}
        {(business as any).office_address && (
          <div className="flex items-start gap-1.5 mt-3">
            <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{(business as any).office_address}</p>
          </div>
        )}

        {/* Service Areas */}
        {(business as any).service_areas && (business as any).service_areas.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Areas of Service
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(business as any).service_areas.map((area: string) => (
                <span key={area} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[11px] font-medium">{area}</span>
              ))}
            </div>
          </div>
        )}

        {/* Operating Hours */}
        {(business as any).operating_hours && Object.keys((business as any).operating_hours).length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3.5 w-3.5" /> Hours of Operation
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                const h = (business as any).operating_hours[day];
                if (!h) return null;
                return (
                  <div key={day} className="flex justify-between text-xs text-muted-foreground">
                    <span>{day.slice(0, 3)}</span>
                    <span>{h.closed ? "Closed" : `${h.open} - ${h.close}`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Services */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold mb-3">Services</h2>
        {services && services.length > 0 ? (
          <div className="flex flex-col gap-3">
            {services.map((service) => {
              const cat = CATEGORIES.find((c) => c.value === service.category);
              return (
                <div key={service.id} className="bg-card rounded-xl border p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      {cat && (
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1", cat.color)}>
                          <cat.icon className="h-3 w-3" /> {cat.label}
                        </span>
                      )}
                      <h3 className="font-semibold text-sm">{service.title}</h3>
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-primary">${Number(service.base_price).toFixed(0)}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => navigate(`/book/${service.id}`)}
                  >
                    Book Now
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No services listed yet</p>
        )}
      </div>

      {/* Portfolio */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold mb-3">Our Work</h2>
        <PortfolioGallery businessId={id!} />
      </div>

      {/* Reviews */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold mb-3">Reviews</h2>
        <ReviewsList businessId={id!} />
      </div>
    </div>
  );
};

export default BusinessProfilePage;
