import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const REPORT_REASONS = [
  { value: "fraud", label: "Fraud or scam" },
  { value: "bad_behaviour", label: "Bad behaviour" },
  { value: "fake_request", label: "Fake request or listing" },
  { value: "no_show", label: "Didn't show up" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "other", label: "Something else" },
] as const;

const schema = z.object({
  reason: z.enum(["fraud", "bad_behaviour", "fake_request", "no_show", "harassment", "other"]),
  details: z.string().trim().min(10, "Please describe what happened (at least 10 characters)").max(2000),
});

interface Props {
  businessId?: string | null;
  userId?: string | null;
  bookingId?: string | null;
  targetName: string;
  trigger?: React.ReactNode;
}

export const ReportDialog = ({ businessId, userId, bookingId, targetName, trigger }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return navigate("/auth");
    const parsed = schema.safeParse({ reason, details });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("reports" as any).insert({
      reporter_id: user.id,
      reported_business_id: businessId ?? null,
      reported_user_id: userId ?? null,
      booking_id: bookingId ?? null,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });
    setBusy(false);
    if (error) return toast.error("Couldn't send report. Please try again.");
    toast.success("Report sent. Our team will review it.");
    setOpen(false);
    setReason("");
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!user && o ? navigate("/auth") : setOpen(o))}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag className="h-4 w-4 mr-1" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report {targetName}</DialogTitle>
          <DialogDescription>Reports are private. Our team reviews every one.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors",
                reason === r.value ? "border-primary bg-primary/10 text-primary" : "bg-card"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What happened? Include dates and any details that help."
        />
        <Button onClick={submit} disabled={busy || !reason}>
          {busy ? "Sending..." : "Send report"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
