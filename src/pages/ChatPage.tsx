import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ChatPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: booking } = useQuery({
    queryKey: ["chat-booking", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, services(title), businesses(name, owner_id), profiles:customer_id(full_name)")
        .eq("id", bookingId!)
        .maybeSingle();
      return data;
    },
    enabled: !!bookingId,
  });

  const { data: messages } = useQuery({
    queryKey: ["booking-messages", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles:sender_id(full_name)")
        .eq("booking_id", bookingId!)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!bookingId,
  });

  // Realtime
  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        () => queryClient.invalidateQueries({ queryKey: ["booking-messages", bookingId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read
  useEffect(() => {
    if (!user || !messages?.length || !bookingId) return;
    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("booking_id", bookingId)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }));
  }, [messages, user, bookingId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !user || !bookingId) return;
      const { error } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: user.id,
        content: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["booking-messages", bookingId] });
    },
  });

  if (!user || !booking) return null;

  const isBusinessOwner = user.id === (booking as any).businesses?.owner_id;
  const otherName = isBusinessOwner
    ? (booking as any).profiles?.full_name || "Customer"
    : (booking as any).businesses?.name || "Business";

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg active-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">{otherName}</h2>
          <p className="text-[10px] text-muted-foreground truncate">{(booking as any).services?.title}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-background">
        {messages && messages.length > 0 ? (
          messages.map((msg: any) => {
            const isMine = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 rounded-2xl text-sm",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                  {format(new Date(msg.created_at), "h:mm a")}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">No messages yet. Say hello!</p>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }}
        className="flex gap-2 p-3 border-t bg-card"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-secondary border-0"
        />
        <Button type="submit" size="sm" disabled={!message.trim() || sendMutation.isPending} className="h-9 w-9 p-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatPage;
