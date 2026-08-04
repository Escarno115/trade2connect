import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Send } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const MessagesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // Live updates: refresh conversations whenever any message changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const sendReply = async (bookingId: string) => {
    if (!replyText.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      booking_id: bookingId,
      sender_id: user.id,
      content: replyText.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send message");
      return;
    }
    setReplyText("");
    setReplyTo(null);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    queryClient.invalidateQueries({ queryKey: ["booking-messages", bookingId] });
  };

  // Get all bookings with messages for this user (as customer or business owner)
  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ["conversations", user?.id],

    queryFn: async () => {
      // Get bookings where user is customer
      const { data: customerBookings, error: customerBookingsError } = await supabase
        .from("bookings")
        .select("id, services(title), businesses(name)")
        .eq("customer_id", user!.id);
      if (customerBookingsError) throw customerBookingsError;

      // Get bookings where user is business owner
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (businessError) throw businessError;

      let businessBookings: any[] = [];
      if (businessData) {
        const { data: ownedBookings, error: ownedBookingsError } = await supabase
          .from("bookings")
          .select("id, customer_id, services(title)")
          .eq("business_id", businessData.id);

        if (ownedBookingsError) throw ownedBookingsError;

        const customerIds = Array.from(
          new Set((ownedBookings ?? []).map((booking: any) => booking.customer_id).filter(Boolean))
        );

        let profileMap = new Map<string, string>();

        if (customerIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", customerIds);

          if (profilesError) throw profilesError;

          profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
        }

        businessBookings = (ownedBookings ?? []).map((b: any) => ({
          ...b,
          otherName: profileMap.get(b.customer_id) || "Customer",
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
          const { data: msgs, error: messagesError } = await supabase
            .from("messages")
            .select("content, created_at, sender_id, is_read")
            .eq("booking_id", booking.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (messagesError) throw messagesError;
          
          const lastMsg = msgs?.[0];
          if (!lastMsg) return null;

          const unreadCount = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("booking_id", booking.id)
            .eq("is_read", false)
            .neq("sender_id", user!.id);

          if (unreadCount.error) throw unreadCount.error;

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
        {error ? (
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            We couldn’t load your conversations right now.
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map((conv: any) => (
              <div key={conv.bookingId} className="bg-card rounded-xl border">
              <button
                onClick={() => navigate(`/messages/${conv.bookingId}`)}
                className="w-full p-3 flex items-center gap-3 text-left active-scale"
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
              {replyTo === conv.bookingId ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); sendReply(conv.bookingId); }}
                  className="flex gap-2 px-3 pb-3"
                >
                  <Input
                    autoFocus
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 h-9 text-xs bg-secondary border-0"
                  />
                  <Button type="submit" size="sm" disabled={!replyText.trim() || sending} className="h-9 w-9 p-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <button
                  onClick={() => { setReplyTo(conv.bookingId); setReplyText(""); }}
                  className="w-full text-left px-3 pb-3 text-xs text-primary font-medium"
                >
                  Quick reply
                </button>
              )}
              </div>

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
