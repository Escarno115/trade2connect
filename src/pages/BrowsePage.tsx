import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCard } from "@/components/ServiceCard";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const BrowsePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "";
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [city, setCity] = useState("");

  const { data: services, isLoading } = useQuery({
    queryKey: ["browse-services", selectedCategory, search, city, priceRange],
    queryFn: async () => {
      let query = supabase
        .from("services")
        .select("id, title, description, base_price, category, business_id, businesses(id, name, city, verification_status, subscription_tier, logo_url)")
        .eq("is_active", true);

      if (selectedCategory) {
        query = query.eq("category", selectedCategory as any);
      }
      if (search) {
        query = query.ilike("title", `%${search}%`);
      }
      if (priceRange[0] > 0) {
        query = query.gte("base_price", priceRange[0]);
      }
      if (priceRange[1] < 10000) {
        query = query.lte("base_price", priceRange[1]);
      }

      const { data } = await query.order("created_at", { ascending: false }).limit(50);
      let results = (data ?? []).map((s: any) => ({ ...s, business: s.businesses }));

      if (city) {
        results = results.filter((s: any) => s.business?.city?.toLowerCase().includes(city.toLowerCase()));
      }

      // Sort: Higher tier businesses first (Ultimate > Pro > Standard)
      const tierOrder: Record<string, number> = { pro: 0, basic: 1, free: 2 };
      results.sort((a: any, b: any) => {
        const aTier = tierOrder[a.business?.subscription_tier] ?? 2;
        const bTier = tierOrder[b.business?.subscription_tier] ?? 2;
        return aTier - bTier;
      });

      return results;
    },
  });

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
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

        {/* Category chips */}
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

        {/* Filters panel */}
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
              <label className="text-xs font-medium text-muted-foreground">
                Price range: ${priceRange[0]} – ${priceRange[1] >= 10000 ? "∞" : priceRange[1]}
              </label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0] || ""}
                  onChange={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                  className="h-9 text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1] >= 10000 ? "" : priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 10000])}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <button
              onClick={() => { setCity(""); setPriceRange([0, 10000]); }}
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
        ) : services && services.length > 0 ? (
          <div className="flex flex-col gap-3">
            {services.map((service: any) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No services found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowsePage;
