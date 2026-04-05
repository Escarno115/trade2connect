import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, DollarSign, BarChart3, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const CHART_COLORS = ["hsl(160, 84%, 39%)", "hsl(160, 84%, 55%)", "hsl(160, 84%, 70%)", "hsl(25, 95%, 53%)", "hsl(25, 95%, 70%)"];

const BusinessAnalyticsPage = () => {
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

  const { data: bookings } = useQuery({
    queryKey: ["analytics-bookings", business?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, services(title, category)")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!business,
  });

  const { data: reviews } = useQuery({
    queryKey: ["analytics-reviews", business?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .eq("business_id", business!.id);
      return data ?? [];
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
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-6 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Sign in to view analytics</h2>
        <Button className="mt-4" onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-6 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Create your business first</h2>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>Open Dashboard</Button>
      </div>
    );
  }

  // Monthly bookings data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthBookings = bookings?.filter((b: any) => {
      const d = new Date(b.created_at);
      return d >= start && d <= end;
    }) ?? [];
    const revenue = monthBookings
      .filter((b: any) => b.status === "completed")
      .reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0);
    return {
      month: format(date, "MMM"),
      bookings: monthBookings.length,
      revenue,
    };
  });

  // Popular services (by booking count)
  const serviceCounts: Record<string, number> = {};
  bookings?.forEach((b: any) => {
    const title = b.services?.title || "Unknown";
    serviceCounts[title] = (serviceCounts[title] || 0) + 1;
  });
  const popularServices = Object.entries(serviceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Stats
  const totalBookings = bookings?.length ?? 0;
  const completedBookings = bookings?.filter((b: any) => b.status === "completed") ?? [];
  const totalRevenue = completedBookings.reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0);
  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "N/A";
  const completionRate = totalBookings > 0
    ? Math.round((completedBookings.length / totalBookings) * 100)
    : 0;

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg active-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Analytics</h1>
      </div>

      {/* Stats Grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border p-3 text-center">
          <BarChart3 className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">{totalBookings}</p>
          <p className="text-[10px] text-muted-foreground">Total Bookings</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">${totalRevenue.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">Total Revenue</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <Star className="h-4 w-4 mx-auto text-amber-500 mb-1" />
          <p className="text-lg font-bold">{avgRating}</p>
          <p className="text-[10px] text-muted-foreground">Avg Rating</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <TrendingUp className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">{completionRate}%</p>
          <p className="text-[10px] text-muted-foreground">Completion Rate</p>
        </div>
      </div>

      {/* Bookings Trend */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold mb-3">Bookings (Last 6 Months)</h3>
        <div className="bg-card rounded-xl border p-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(value: number) => [value, "Bookings"]}
              />
              <Bar dataKey="bookings" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="px-4 mt-4">
        <h3 className="text-sm font-semibold mb-3">Revenue (Last 6 Months)</h3>
        <div className="bg-card rounded-xl border p-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(value: number) => [`$${value.toFixed(0)}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Popular Services */}
      {popularServices.length > 0 && (
        <div className="px-4 mt-4">
          <h3 className="text-sm font-semibold mb-3">Popular Services</h3>
          <div className="bg-card rounded-xl border p-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={popularServices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {popularServices.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessAnalyticsPage;
