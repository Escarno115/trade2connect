import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get all bookings with messages for this user (as customer or business owner)
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      // Get bookings where user is customer
      const { data: customerBookings } = await supabase
        .from("bookings")
        .select("id, services(title), businesses(name)")
        .eq("customer_id", user!.id);

      // Get bookings where user is business owner
      const { data: businessData } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();

      let businessBookings: any[] = [];
      if (businessData) {
        const { data } = await supabase
          .from("bookings")
          .select("id, services(title), profiles:customer_id(full_name)")
          .eq("business_id", businessData.id);
        businessBookings = (data ?? []).map((b: any) => ({
          ...b,
          otherName: b.profiles?.full_name || "Customer",
          role: "business",
        }));
      }

      const allBookings = [
        ...(customerBookings ?? []).map((b: any) => ({
          ...b,
          otherName: b.businesses?.name || "Business",
          role: "customer",
        })),
        ...businessBookings,
      ];

      // Get last message for each booking
      const results = await Promise.all(
        allBookings.map(async (booking) => {
          const { data: msgs } = await supabase
            .from("messages")
            .select("content, created_at, sender_id, is_read")
            .eq("booking_id", booking.id)
            .order("created_at", { ascending: false })
            .limit(1);
          
          const lastMsg = msgs?.[0];
          if (!lastMsg) return null;

          const unreadCount = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("booking_id", booking.id)
            .eq("is_read", false)
            .neq("sender_id", user!.id);

          return {
            bookingId: booking.id,
            serviceName: booking.services?.title || "Service",
            otherName: booking.otherName,
            lastMessage: lastMsg.content,
            lastMessageAt: lastMsg.created_at,
            unread: unreadCount.count ?? 0,
            role: booking.role,
          };
        })
      );

      return results
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-6">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Sign in to view messages</h2>
        <Button className="mt-4" onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">Your conversations</p>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map((conv: any) => (
              <button
                key={conv.bookingId}
                onClick={() => navigate(`/messages/${conv.bookingId}`)}
                className="w-full bg-card rounded-xl border p-3 flex items-center gap-3 text-left active-scale"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold truncate">{conv.otherName}</h3>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(conv.lastMessageAt), "MMM d")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.serviceName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Messages will appear when you start chatting on a booking</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
