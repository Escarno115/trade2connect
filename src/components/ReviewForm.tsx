import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  bookingId: string;
  businessId: string;
  customerId: string;
  onDone?: () => void;
}

export const ReviewForm = ({ bookingId, businessId, customerId, onDone }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (rating === 0) throw new Error("Please select a rating");
      const { error } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        business_id: businessId,
        customer_id: customerId,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted! ⭐");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const displayRating = hoveredRating || rating;

  return (
    <div className="mt-3 p-3 bg-secondary rounded-xl space-y-3">
      <p className="text-xs font-medium">Rate this service</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            onClick={() => setRating(star)}
            className="p-0.5 active:scale-95 transition-transform"
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                star <= displayRating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Share your experience (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
        className="text-sm"
      />
      <Button
        size="sm"
        className="w-full"
        disabled={rating === 0 || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </div>
  );
};
