import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface BookingChatProps {
  bookingId: string;
  businessOwnerId?: string;
}

export const BookingChat = ({ bookingId, businessOwnerId }: BookingChatProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["booking-messages", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles:sender_id(full_name)")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: isOpen,
  });

  // Realtime subscription
  useEffect(() => {
    if (!isOpen) return;
    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["booking-messages", bookingId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId, isOpen, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !user) return;
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

  // Mark messages as read
  useEffect(() => {
    if (!isOpen || !user || !messages?.length) return;
    const unread = messages.filter((m: any) => !m.is_read && m.sender_id !== user.id);
    if (unread.length > 0) {
      supabase
        .from("messages")
        .update({ is_read: true })
        .eq("booking_id", bookingId)
        .neq("sender_id", user.id)
        .eq("is_read", false)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["unread-count"] });
        });
    }
  }, [isOpen, messages, user, bookingId, queryClient]);

  if (!user) return null;

  const isBusinessOwner = user.id === businessOwnerId;

  if (!isOpen) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-2 text-xs"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chat
      </Button>
    );
  }

  return (
    <div className="mt-2 border rounded-xl overflow-hidden">
      <div className="bg-secondary px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-medium">Messages</span>
        <button onClick={() => setIsOpen(false)} className="text-xs text-muted-foreground">
          Close
        </button>
      </div>

      <div ref={scrollRef} className="h-48 overflow-y-auto p-3 space-y-2 bg-background">
        {messages && messages.length > 0 ? (
          messages.map((msg: any) => {
            const isMine = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 rounded-2xl text-xs",
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
          <p className="text-xs text-muted-foreground text-center py-6">No messages yet. Start the conversation!</p>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }}
        className="flex gap-2 p-2 border-t bg-card"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-8 text-xs border-0 bg-secondary"
        />
        <Button type="submit" size="sm" disabled={!message.trim() || sendMutation.isPending} className="h-8 w-8 p-0">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
};
