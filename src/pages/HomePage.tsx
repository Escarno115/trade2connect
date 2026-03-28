import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CategoryGrid } from "@/components/CategoryGrid";
import { BusinessCard } from "@/components/BusinessCard";
import { ServiceCard } from "@/components/ServiceCard";

const HomePage = () => {
  const navigate = useNavigate();

  const { data: featuredBusinesses } = useQuery({
    queryKey: ["featured-businesses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, description, city, verification_status, subscription_tier, logo_url")
        .eq("verification_status", "approved")
        .eq("is_active", true)
        .order("subscription_tier", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const { data: recentServices } = useQuery({
    queryKey: ["recent-services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, title, description, base_price, category, business_id, businesses(id, name, city, verification_status, subscription_tier, logo_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []).map((s: any) => ({ ...s, business: s.businesses }));
    },
  });

  return (
    <div className="pb-20">
      {/* Header */}
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
          <span className="text-sm text-muted-foreground">Search services...</span>
        </button>
      </div>

      {/* Categories */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold mb-3">Categories</h2>
        <CategoryGrid />
      </div>

      {/* Featured Businesses */}
      {featuredBusinesses && featuredBusinesses.length > 0 && (
        <div className="px-4 mt-8">
          <h2 className="text-lg font-bold mb-3">Featured Businesses</h2>
          <div className="flex flex-col gap-3">
            {featuredBusinesses.map((biz) => (
              <BusinessCard key={biz.id} business={biz} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Services */}
      {recentServices && recentServices.length > 0 && (
        <div className="px-4 mt-8">
          <h2 className="text-lg font-bold mb-3">Recent Services</h2>
          <div className="flex flex-col gap-3">
            {recentServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!featuredBusinesses || featuredBusinesses.length === 0) && (!recentServices || recentServices.length === 0) && (
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
