import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ReviewForm } from "@/components/ReviewForm";
import { BookingChat } from "@/components/BookingChat";

const statusMessages: Record<string, string> = {
  accepted: "Your booking has been accepted! 🎉",
  rejected: "Your booking was declined.",
  in_progress: "Your job is now in progress! 🔧",
  completed: "Your job is complete! ✅",
  cancelled: "Your booking has been cancelled.",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-700",
};

const BookingsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('booking-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status as string;
          const msg = statusMessages[newStatus];
          if (msg) toast(msg);
          queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, services(title, category), businesses(name, city)")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Business owner: bookings received for their business
  const { data: myBusiness } = useQuery({
    queryKey: ["my-business-for-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: incoming, isLoading: incomingLoading } = useQuery({
    queryKey: ["incoming-bookings", myBusiness?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, services(title, category)")
        .eq("business_id", myBusiness!.id)
        .order("created_at", { ascending: false });

      const { data: customers } = await supabase.rpc("get_booking_customer_summaries", {
        _business_id: myBusiness!.id,
      });
      const nameMap = new Map((customers ?? []).map((c: any) => [c.id, c.full_name]));

      return (data ?? []).map((b: any) => ({
        ...b,
        customerName: nameMap.get(b.customer_id) || "Customer",
      }));
    },
    enabled: !!myBusiness?.id,
  });

  // Live updates for incoming bookings
  useEffect(() => {
    if (!myBusiness?.id) return;
    const channel = supabase
      .channel(`incoming-bookings-${myBusiness.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${myBusiness.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["incoming-bookings"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myBusiness?.id, queryClient]);

  const [tab, setTab] = useState<"mine" | "incoming">("mine");

  // Fetch existing reviews by this user to know which bookings already have reviews
  const { data: myReviews } = useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("booking_id")
        .eq("customer_id", user!.id);
      return new Set((data ?? []).map((r) => r.booking_id));
    },
    enabled: !!user,
  });

  const [reviewingBookingId, setReviewingBookingId] = useState<string | null>(null);


  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-20 px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-6">
        <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Sign in to view bookings</h2>
        <p className="text-sm text-muted-foreground mt-1 text-center">Track your service requests and history</p>
        <Button className="mt-4" onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-sm text-muted-foreground">Track your service requests</p>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />)}
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((booking: any) => (
              <div key={booking.id} className="bg-card rounded-xl border p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{booking.services?.title}</h3>
                    <p className="text-xs text-muted-foreground">{booking.businesses?.name}</p>
                  </div>
                  <Badge className={cn("text-[10px] border-0", statusColors[booking.status])}>
                    {booking.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(booking.scheduled_date), "MMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {booking.scheduled_time}
                  </span>
                </div>
                {booking.total_price && (
                  <p className="text-sm font-bold text-primary mt-2">${Number(booking.total_price).toFixed(2)}</p>
                )}
                {/* Review section for completed bookings */}
                {booking.status === "completed" && user && (
                  myReviews?.has(booking.id) ? (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Review submitted
                    </p>
                  ) : reviewingBookingId === booking.id ? (
                    <ReviewForm
                      bookingId={booking.id}
                      businessId={booking.business_id}
                      customerId={user.id}
                      onDone={() => {
                        setReviewingBookingId(null);
                        queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
                      }}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 text-xs"
                      onClick={() => setReviewingBookingId(booking.id)}
                    >
                      <Star className="h-3.5 w-3.5 mr-1" /> Leave a Review
                    </Button>
                  )
                )}
                {/* Chat */}
                {["accepted", "in_progress", "completed"].includes(booking.status) && (
                  <BookingChat bookingId={booking.id} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No bookings yet</p>
            <Button variant="ghost" className="mt-2 text-primary" onClick={() => navigate("/browse")}>
              Browse services
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsPage;
