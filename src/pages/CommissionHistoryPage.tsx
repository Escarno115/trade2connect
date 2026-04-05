import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingDown, DollarSign, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TIER_LABELS, TIER_COMMISSIONS } from "@/lib/constants";

const CommissionHistoryPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ["my-business", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: completedBookings, isLoading } = useQuery({
    queryKey: ["commission-history", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(title)")
        .eq("business_id", business!.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const customerIds = Array.from(new Set((data ?? []).map((booking: any) => booking.customer_id).filter(Boolean)));
      let profileMap = new Map<string, string>();

      if (customerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", customerIds);

        if (profilesError) throw profilesError;

        profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
      }

      return (data ?? []).map((booking: any) => ({
        ...booking,
        customerName: profileMap.get(booking.customer_id) ?? "Customer",
      }));
    },
    enabled: !!business,
  });

  if (authLoading || (user && businessLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-20 px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-6">
        <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Sign in to view commissions</h2>
        <Button className="mt-4" onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-6 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Set up your business first</h2>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>Open Dashboard</Button>
      </div>
    );
  }

  const totalRevenue = completedBookings?.reduce((s, b: any) => s + (Number(b.total_price) || 0), 0) ?? 0;
  const totalCommission = completedBookings?.reduce((s, b: any) => s + (Number(b.commission_amount) || 0), 0) ?? 0;
  const netEarnings = totalRevenue - totalCommission;

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg active-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Commission History</h1>
      </div>

      {/* Summary cards */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-2">
        <div className="bg-card rounded-xl border p-3 text-center">
          <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-sm font-bold">${totalRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Total Revenue</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
          <p className="text-sm font-bold text-destructive">${totalCommission.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Commission</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <Receipt className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-sm font-bold text-primary">${netEarnings.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Net Earnings</p>
        </div>
      </div>

      {business && (
        <div className="px-4 mt-3">
          <p className="text-xs text-muted-foreground">
            Current tier: <span className="font-semibold text-foreground">{TIER_LABELS[business.subscription_tier]}</span> · {TIER_COMMISSIONS[business.subscription_tier]}% commission
          </p>
        </div>
      )}

      {/* Booking-level breakdown */}
      <div className="px-4 mt-4">
        <h2 className="text-sm font-semibold mb-2">Completed Bookings</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-secondary rounded-xl animate-pulse" />)}
          </div>
        ) : completedBookings && completedBookings.length > 0 ? (
          <div className="space-y-2">
            {completedBookings.map((b: any) => (
              <div key={b.id} className="bg-card rounded-xl border p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{b.services?.title}</h3>
                    <p className="text-[11px] text-muted-foreground">{b.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(b.updated_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">${Number(b.total_price).toFixed(2)}</p>
                    {Number(b.commission_amount) > 0 && (
                      <Badge className="text-[10px] border-0 bg-destructive/10 text-destructive mt-0.5">
                        -{Number(b.commission_amount).toFixed(2)} ({b.commission_rate}%)
                      </Badge>
                    )}
                  </div>
                </div>
                {Number(b.commission_amount) > 0 && (
                  <div className="mt-2 pt-2 border-t flex justify-between text-xs">
                    <span className="text-muted-foreground">You receive</span>
                    <span className="font-semibold text-primary">
                      ${(Number(b.total_price) - Number(b.commission_amount)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No completed bookings yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionHistoryPage;
