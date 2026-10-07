import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const db = supabase as any;

export const useLoyalty = (businessId?: string) =>
  useQuery({
    queryKey: ["business-loyalty", businessId],
    queryFn: async () => {
      const { data } = await db.from("business_loyalty").select("*").eq("business_id", businessId).maybeSingle();
      return data as { enabled: boolean; discount_percent: number; min_bookings: number } | null;
    },
    enabled: !!businessId,
  });

export const useRepeatStats = (businessId?: string) =>
  useQuery({
    queryKey: ["business-repeat-stats", businessId],
    queryFn: async () => {
      const { data } = await db.from("business_repeat_stats").select("*").eq("business_id", businessId).maybeSingle();
      return data as { unique_customers: number; repeat_customers: number } | null;
    },
    enabled: !!businessId,
  });

export const repeatRate = (s?: { unique_customers: number; repeat_customers: number } | null) =>
  s && s.unique_customers > 0 ? Math.round((s.repeat_customers / s.unique_customers) * 100) : null;

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;
export const loyaltyText = (l: { discount_percent: number; min_bookings: number }) =>
  `${l.discount_percent}% off from your ${ordinal(l.min_bookings)} booking`;

/** Public badges for the business profile */
export const RepeatBadges = ({ businessId }: { businessId: string }) => {
  const { data: stats } = useRepeatStats(businessId);
  const { data: loyalty } = useLoyalty(businessId);
  const rate = repeatRate(stats);
  if (!loyalty?.enabled && (rate === null || (stats?.unique_customers ?? 0) < 3)) return null;
  return (
    <div className="mt-3 flex flex-col gap-2">
      {rate !== null && (stats?.unique_customers ?? 0) >= 3 && (
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
          <Repeat className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold">{rate}% of customers come back</p>
        </div>
      )}
      {loyalty?.enabled && (
        <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-lg px-3 py-2">
          <Gift className="h-4 w-4" />
          <p className="text-xs font-semibold">Loyalty reward: {loyaltyText(loyalty)}</p>
        </div>
      )}
    </div>
  );
};

/** Owner settings card for the dashboard */
export const LoyaltySettings = ({ businessId }: { businessId: string }) => {
  const qc = useQueryClient();
  const { data: loyalty, isLoading } = useLoyalty(businessId);
  const [enabled, setEnabled] = useState(false);
  const [pct, setPct] = useState("10");
  const [min, setMin] = useState("3");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loyalty) {
      setEnabled(loyalty.enabled);
      setPct(String(loyalty.discount_percent));
      setMin(String(loyalty.min_bookings));
    }
  }, [loyalty]);

  const save = async () => {
    const p = parseInt(pct, 10), m = parseInt(min, 10);
    if (!(p >= 1 && p <= 50)) return toast.error("Discount must be between 1% and 50%");
    if (!(m >= 2 && m <= 20)) return toast.error("Start booking must be between 2 and 20");
    setBusy(true);
    const { error } = await db.from("business_loyalty").upsert({ business_id: businessId, enabled, discount_percent: p, min_bookings: m });
    setBusy(false);
    if (error) return toast.error("Couldn't save loyalty reward");
    toast.success("Loyalty reward saved");
    qc.invalidateQueries({ queryKey: ["business-loyalty", businessId] });
  };

  if (isLoading) return null;
  return (
    <div className="bg-card rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Loyalty reward</h3>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <p className="text-xs text-muted-foreground">Reward customers who come back. The discount is applied automatically at booking.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Discount %
          <Input type="number" min={1} max={50} value={pct} onChange={(e) => setPct(e.target.value)} className="mt-1 h-9" />
        </label>
        <label className="text-xs">From booking #
          <Input type="number" min={2} max={20} value={min} onChange={(e) => setMin(e.target.value)} className="mt-1 h-9" />
        </label>
      </div>
      <Button size="sm" className="w-full" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save reward"}</Button>
    </div>
  );
};

/** Analytics card for the business owner */
export const RepeatStatsCard = ({ businessId }: { businessId: string }) => {
  const { data: stats } = useRepeatStats(businessId);
  const rate = repeatRate(stats);
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Repeat customers</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-lg font-bold">{stats?.unique_customers ?? 0}</p><p className="text-[10px] text-muted-foreground">Customers</p></div>
        <div><p className="text-lg font-bold">{stats?.repeat_customers ?? 0}</p><p className="text-[10px] text-muted-foreground">Came back</p></div>
        <div><p className="text-lg font-bold text-primary">{rate ?? 0}%</p><p className="text-[10px] text-muted-foreground">Repeat rate</p></div>
      </div>
    </div>
  );
};
