import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CategoryGrid } from "@/components/CategoryGrid";
import { BusinessCard } from "@/components/BusinessCard";

const HomePage = () => {
  const navigate = useNavigate();

  const { data: businesses } = useQuery({
    queryKey: ["home-businesses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses_public")
        .select("id, name, description, city, verification_status, subscription_tier, logo_url")
        .eq("is_active", true)
        .order("subscription_tier", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const businessIds = businesses?.map((b: any) => b.id).filter(Boolean) ?? [];

  const { data: serviceCounts } = useQuery({
    queryKey: ["home-service-counts", businessIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("business_id")
        .eq("is_active", true)
        .in("business_id", businessIds);
      const map: Record<string, number> = {};
      (data ?? []).forEach((s: any) => {
        map[s.business_id] = (map[s.business_id] || 0) + 1;
      });
      return map;
    },
    enabled: businessIds.length > 0,
  });

  const { data: ratingsMap } = useQuery({
    queryKey: ["home-ratings", businessIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews_public")
        .select("business_id, rating")
        .in("business_id", businessIds);
      const map: Record<string, { sum: number; count: number }> = {};
      (data ?? []).forEach((r: any) => {
        if (!map[r.business_id]) map[r.business_id] = { sum: 0, count: 0 };
        map[r.business_id].sum += r.rating;
        map[r.business_id].count += 1;
      });
      return map;
    },
    enabled: businessIds.length > 0,
  });

  const { data: responseMap } = useQuery({
    queryKey: ["home-response-stats", businessIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_response_stats")
        .select("business_id, avg_response_seconds")
        .in("business_id", businessIds);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        if (r.avg_response_seconds != null) map[r.business_id] = r.avg_response_seconds;
      });
      return map;
    },
    enabled: businessIds.length > 0,
  });

  return (
    <div className="pb-20">
      <div className="bg-primary px-4 pt-12 pb-8 rounded-b-3xl">
        <h1 className="text-2xl font-bold text-primary-foreground leading-tight">
          Find trusted<br />tradespeople nearby
        </h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Verified professionals, one tap away</p>

        <button
          onClick={() => navigate("/browse")}
          className="mt-4 w-full flex items-center gap-3 bg-card rounded-xl px-4 py-3 active-scale"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search businesses...</span>
        </button>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold mb-3">Categories</h2>
        <CategoryGrid />
      </div>

      {businesses && businesses.length > 0 && (
        <div className="px-4 mt-8">
          <h2 className="text-lg font-bold mb-3">Top Businesses</h2>
          <div className="flex flex-col gap-3">
            {businesses.map((biz: any) => {
              const r = ratingsMap?.[biz.id];
              return (
                <BusinessCard
                  key={biz.id}
                  business={biz}
                  serviceCount={serviceCounts?.[biz.id] ?? 0}
                  avgRating={r ? r.sum / r.count : 0}
                  reviewCount={r?.count ?? 0}
                />
              );
            })}
          </div>
        </div>
      )}

      {(!businesses || businesses.length === 0) && (
        <div className="px-4 mt-8 text-center">
          <div className="bg-secondary rounded-2xl p-8">
            <p className="text-muted-foreground text-sm">No businesses yet. Be the first to register!</p>
            <button
              onClick={() => navigate("/auth?role=business")}
              className="mt-3 text-sm font-semibold text-primary active-scale"
            >
              Register your business →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
