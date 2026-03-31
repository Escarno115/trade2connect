import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ReviewResponse } from "@/components/ReviewResponse";

interface ReviewsListProps {
  businessId: string;
  isOwner?: boolean;
}

export const ReviewsList = ({ businessId, isOwner = false }: ReviewsListProps) => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", businessId],
    queryFn: async () => {
      // Use reviews_public view for public reads (no customer_id exposed)
      const { data } = await supabase
        .from("reviews_public")
        .select("*, review_responses(*)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  if (isLoading) {
    return <div className="h-20 bg-secondary rounded-xl animate-pulse" />;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No reviews yet
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "h-4 w-4",
                star <= Math.round(avgRating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/20"
              )}
            />
          ))}
        </div>
        <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">
          ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
        </span>
      </div>

      {/* Individual reviews */}
      {reviews.map((review: any) => {
        const response = review.review_responses?.[0] ?? null;
        return (
          <div key={review.id} className="bg-card rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                  C
                </div>
                <span className="text-xs font-medium">Customer</span>
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-3 w-3",
                      star <= review.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/20"
                    )}
                  />
                ))}
              </div>
            </div>
            {review.comment && (
              <p className="text-xs text-muted-foreground mt-2">{review.comment}</p>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              {format(new Date(review.created_at), "MMM d, yyyy")}
            </p>
            <ReviewResponse
              reviewId={review.id}
              businessId={businessId}
              existingResponse={response}
              canRespond={isOwner && !response}
            />
          </div>
        );
      })}
    </div>
  );
};
