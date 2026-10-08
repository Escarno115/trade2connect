import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarDays, Clock, Gift } from "lucide-react";
import { useLoyalty, loyaltyText } from "@/components/RepeatCustomers";
import { toast } from "sonner";

const BookServicePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const { data: service } = useQuery({
    queryKey: ["service", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("*, businesses(id, name, city)")
        .eq("id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: loyalty } = useLoyalty(service?.business_id);
  const { data: completedCount } = useQuery({
    queryKey: ["my-completed-count", service?.business_id, user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", service!.business_id)
        .eq("customer_id", user!.id)
        .eq("status", "completed");
      return count ?? 0;
    },
    enabled: !!service?.business_id && !!user,
  });
  // Display only — the real discount is applied on the server when the booking is saved
  const discount = loyalty?.enabled && (completedCount ?? 0) + 1 >= loyalty.min_bookings ? loyalty.discount_percent : 0;

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!user || !service) throw new Error("Not authenticated");
      const { error } = await supabase.from("bookings").insert({
        customer_id: user.id,
        business_id: service.business_id,
        service_id: service.id,
        scheduled_date: date,
        scheduled_time: time,
        notes: notes || null,
        // total_price is set server-side from the service's current listed price

      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking submitted!");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      navigate("/bookings");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <p className="text-muted-foreground text-sm">Please sign in to book a service</p>
        <Button className="mt-3" onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg active-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 mt-4">
        <h1 className="text-xl font-bold">Book Service</h1>
        {service && (
          <div className="mt-3 p-4 bg-card rounded-xl border">
            <h3 className="font-semibold text-sm">{service.title}</h3>
            <p className="text-xs text-muted-foreground">{(service as any).businesses?.name}</p>
            {discount > 0 ? (
              <p className="text-sm font-bold text-primary mt-1">
                ${(Number(service.base_price) * (100 - discount) / 100).toFixed(2)}
                <span className="ml-2 text-xs text-muted-foreground line-through font-normal">${Number(service.base_price).toFixed(2)}</span>
              </p>
            ) : (
              <p className="text-sm font-bold text-primary mt-1">${Number(service.base_price).toFixed(2)}</p>
            )}
            {loyalty?.enabled && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium">
                <Gift className="h-3.5 w-3.5" />
                {discount > 0
                  ? `Welcome back! Your ${loyalty.discount_percent}% loyalty discount is applied.`
                  : `Loyalty reward: ${loyaltyText(loyalty)} (${completedCount ?? 0} done so far).`}
              </p>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            bookMutation.mutate();
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Time
            </Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the job, location details, etc."
              className="mt-1"
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={bookMutation.isPending}>
            {bookMutation.isPending ? "Submitting..." : "Confirm Booking"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BookServicePage;
