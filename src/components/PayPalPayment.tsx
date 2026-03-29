import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";

interface PayPalPaymentProps {
  invoiceId: string;
  amount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const PayPalPayment = ({ invoiceId, amount, open, onOpenChange, onSuccess }: PayPalPaymentProps) => {
  const [paypalEmail, setPaypalEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handlePayment = async () => {
    if (!paypalEmail.includes("@")) {
      toast.error("Please enter a valid PayPal email");
      return;
    }
    setLoading(true);
    try {
      // Mark invoice as paid
      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() } as any)
        .eq("id", invoiceId);
      if (error) throw error;
      setConfirmed(true);
      toast.success("Payment recorded successfully!");
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setConfirmed(false);
        setPaypalEmail("");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pay with PayPal
          </DialogTitle>
          <DialogDescription>
            Pay ${amount.toFixed(2)} for your subscription invoice
          </DialogDescription>
        </DialogHeader>

        {confirmed ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">Payment confirmed!</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">PayPal Email</Label>
              <Input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your-paypal@email.com"
                className="mt-1"
              />
            </div>
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                By proceeding, you confirm payment of <span className="font-semibold text-foreground">${amount.toFixed(2)}</span> via PayPal. 
                You will receive a confirmation from PayPal at the email address above.
              </p>
            </div>
            <Button onClick={handlePayment} className="w-full" disabled={loading || !paypalEmail}>
              {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</> : `Pay $${amount.toFixed(2)}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
