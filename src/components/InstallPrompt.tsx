import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "tradehub-install-dismissed";

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Detect iOS Safari (no beforeinstallprompt)
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const standalone = (navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;

    if (ios && !standalone) {
      setIsIOS(true);
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-2 right-2 max-w-lg mx-auto z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border rounded-2xl shadow-lg p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install TradeConnect</p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap <span className="font-medium">Share</span> then <span className="font-medium">"Add to Home Screen"</span> to install.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get quick access from your home screen — works offline!
              </p>
              <Button size="sm" className="mt-2 text-xs h-8" onClick={handleInstall}>
                Install App
              </Button>
            </>
          )}
        </div>
        <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-secondary shrink-0">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
