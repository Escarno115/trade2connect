import { useState, useEffect, useRef, useCallback } from "react";
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
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  const renderButtons = useCallback(async () => {
    if (renderedRef.current || !containerRef.current) return;
    renderedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Get client ID from edge function
      const { data: clientData, error: cidErr } = await supabase.functions.invoke("paypal-checkout", {
        body: { action: "get-client-id" },
      });
      if (cidErr || !clientData?.clientId) throw new Error("Failed to load PayPal configuration");

      // Load PayPal JS SDK
      const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
      if (existingScript) existingScript.remove();

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientData.clientId}&currency=USD`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PayPal SDK"));
        document.head.appendChild(script);
      });

      const paypal = (window as any).paypal;
      if (!paypal) throw new Error("PayPal SDK not available");

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        paypal.Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay", height: 45 },
          createOrder: async () => {
            const { data, error: createErr } = await supabase.functions.invoke("paypal-checkout", {
              body: { action: "create", invoiceId },
            });
            if (createErr || !data?.orderId) throw new Error(data?.error || "Failed to create order");
            return data.orderId;
          },
          onApprove: async (data: any) => {
            const { data: captureData, error: captureErr } = await supabase.functions.invoke("paypal-checkout", {
              body: { action: "capture", orderId: data.orderID, invoiceId },
            });
            if (captureErr) throw new Error("Payment capture failed");
            if (captureData?.status === "COMPLETED") {
              setConfirmed(true);
              toast.success("Payment completed successfully!");
              setTimeout(() => {
                onSuccess();
                onOpenChange(false);
                setConfirmed(false);
                renderedRef.current = false;
              }, 1500);
            } else {
              toast.error("Payment was not completed");
            }
          },
          onError: (err: any) => {
            console.error("PayPal error:", err);
            toast.error("Payment failed. Please try again.");
          },
        }).render(containerRef.current);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to initialize PayPal");
    } finally {
      setLoading(false);
    }
  }, [invoiceId, onSuccess, onOpenChange]);

  useEffect(() => {
    if (open) {
      renderedRef.current = false;
      // Small delay to ensure dialog DOM is ready
      const timer = setTimeout(() => renderButtons(), 300);
      return () => clearTimeout(timer);
    }
  }, [open, renderButtons]);

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) renderedRef.current = false;
      onOpenChange(o);
    }}>
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
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                Complete your payment of <span className="font-semibold text-foreground">${amount.toFixed(2)}</span> securely through PayPal.
              </p>
            </div>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
            <div ref={containerRef} className="min-h-[50px]" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
