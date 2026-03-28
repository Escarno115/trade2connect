import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareReply } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReviewResponseProps {
  reviewId: string;
  businessId: string;
  existingResponse?: { id: string; content: string; created_at: string } | null;
  canRespond: boolean;
}

export const ReviewResponse = ({ reviewId, businessId, existingResponse, canRespond }: ReviewResponseProps) => {
  const [isReplying, setIsReplying] = useState(false);
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("Response cannot be empty");
      const { error } = await supabase.from("review_responses").insert({
        review_id: reviewId,
        business_id: businessId,
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Response posted!");
      setIsReplying(false);
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (existingResponse) {
    return (
      <div className="mt-2 ml-4 pl-3 border-l-2 border-primary/20">
        <p className="text-[10px] font-medium text-primary">Business Response</p>
        <p className="text-xs text-muted-foreground mt-0.5">{existingResponse.content}</p>
        <p className="text-[9px] text-muted-foreground/60 mt-0.5">
          {format(new Date(existingResponse.created_at), "MMM d, yyyy")}
        </p>
      </div>
    );
  }

  if (!canRespond) return null;

  if (!isReplying) {
    return (
      <button
        onClick={() => setIsReplying(true)}
        className="mt-1.5 text-[10px] text-primary font-medium flex items-center gap-1"
      >
        <MessageSquareReply className="h-3 w-3" /> Reply
      </button>
    );
  }

  return (
    <div className="mt-2 ml-4 space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your response..."
        rows={2}
        maxLength={500}
        className="text-xs"
      />
      <div className="flex gap-2">
        <Button size="sm" className="text-xs flex-1" disabled={!content.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Posting..." : "Post Response"}
        </Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={() => { setIsReplying(false); setContent(""); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
