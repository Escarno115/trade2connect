import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BusinessCard } from "@/components/BusinessCard";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X, Star } from "lucide-react";
import { Input } from "@/components/ui/input";

const BrowsePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "";
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [showFilters, setShowFilters] = useState(false);
  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState(0);

  // When a category is selected, find business IDs offering that service
  const { data: categoryBusinessIds } = useQuery({
    queryKey: ["category-business-ids", selectedCategory],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("business_id")
        .eq("is_active", true)
        .eq("category", selectedCategory as any);
      return [...new Set((data ?? []).map((s: any) => s.business_id))];
    },
    enabled: !!selectedCategory,
  });

  // Fetch businesses
  const { data: businesses, isLoading } = useQuery({
    queryKey: ["browse-businesses", selectedCategory, search, city, categoryBusinessIds],
    queryFn: async () => {
      let query = supabase
        .from("businesses_public")
        .select("id, name, description, city, verification_status, subscription_tier, logo_url")
        .eq("is_active", true);

      if (selectedCategory && categoryBusinessIds && categoryBusinessIds.length > 0) {
        query = query.in("id", categoryBusinessIds);
      } else if (selectedCategory && (!categoryBusinessIds || categoryBusinessIds.length === 0)) {
        return [];
      }

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data } = await query.order("subscription_tier", { ascending: false }).limit(50);
      let results = data ?? [];

      if (city) {
        results = results.filter((b: any) => b.city?.toLowerCase().includes(city.toLowerCase()));
      }

      const tierOrder: Record<string, number> = { pro: 0, basic: 1, free: 2 };
      results.sort((a: any, b: any) => (tierOrder[a.subscription_tier] ?? 2) - (tierOrder[b.subscription_tier] ?? 2));

      return results;
    },
    enabled: !selectedCategory || categoryBusinessIds !== undefined,
  });

  const businessIds = businesses?.map((b: any) => b.id).filter(Boolean) ?? [];

  // Fetch service counts
  const { data: serviceCounts } = useQuery({
    queryKey: ["browse-service-counts", businessIds],
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

  // Fetch ratings
  const { data: ratingsMap } = useQuery({
    queryKey: ["browse-ratings", businessIds],
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

  // Apply rating filter client-side
  const filteredBusinesses = useMemo(() => {
    if (!businesses || minRating === 0 || !ratingsMap) return businesses;
    return businesses.filter((b: any) => {
      const r = ratingsMap[b.id];
      return r ? r.sum / r.count >= minRating : false;
    });
  }, [businesses, minRating, ratingsMap]);

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search businesses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-0"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-2.5 rounded-lg border active-scale",
              showFilters ? "bg-primary text-primary-foreground border-primary" : "bg-card"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => { setSelectedCategory(""); setSearchParams({}); }}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium active-scale transition-colors",
              !selectedCategory ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
            )}
          >
            All
          </button>
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                setSelectedCategory(value === selectedCategory ? "" : value);
                if (value !== selectedCategory) setSearchParams({ category: value });
                else setSearchParams({});
              }}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium active-scale transition-colors",
                selectedCategory === value ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="mt-3 p-3 bg-card rounded-xl border space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Input
                placeholder="Filter by city..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Minimum rating</label>
              <div className="flex gap-1 mt-1">
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium active-scale transition-colors",
                      minRating === r ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {r === 0 ? "Any" : <span className="flex items-center gap-0.5">{r}<Star className="h-3 w-3 fill-current" /></span>}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setCity(""); setMinRating(0); }}
              className="text-xs text-primary font-medium flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredBusinesses && filteredBusinesses.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredBusinesses.map((biz: any) => {
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
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No businesses found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowsePage;
