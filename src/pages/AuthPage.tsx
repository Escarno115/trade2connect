import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Wrench } from "lucide-react";

type Role = "customer" | "business";

// Block obvious disposable / fake email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
  "trashmail.com", "yopmail.com", "throwawaymail.com", "fakeinbox.com",
  "getnada.com", "maildrop.cc", "sharklasers.com", "dispostable.com",
  "tempinbox.com", "mintemail.com", "mailnesia.com", "spambox.us",
  "tempr.email", "emailondeck.com", "moakt.com", "mohmal.com",
  "temp-mail.org", "tmpmail.org", "trbvm.com", "discard.email",
]);

const isLikelyRealEmail = (email: string) => {
  const trimmed = email.trim().toLowerCase();
  // RFC-ish basic check + require a TLD with at least 2 letters
  const re = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/i;
  if (!re.test(trimmed)) return { ok: false, reason: "Please enter a valid email address." };
  const domain = trimmed.split("@")[1];
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, reason: "Disposable email addresses are not allowed. Please use a real email." };
  }
  return { ok: true as const };
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [role] = useState<Role>("business");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (userRole === "business") navigate("/dashboard", { replace: true });
      else if (userRole === "admin") navigate("/admin", { replace: true });
      else navigate("/account", { replace: true });
    }
  }, [user, userRole, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const check = isLikelyRealEmail(email);
        if (!check.ok) {
          toast.error(check.reason);
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName, role },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Account created! Please sign in.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg active-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">TradeConnect</span>
        </div>

        <h1 className="text-2xl font-bold">
          {isLogin ? "Welcome back" : "Register your business"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLogin ? "Sign in to continue" : "Join TradeConnect in seconds"}
        </p>

        {!isLogin && (
          <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground space-y-1.5">
            <p className="font-semibold text-primary">🚀 Free during launch phase</p>
            <p className="text-muted-foreground">
              Sign-ups are currently open to <span className="font-medium text-foreground">businesses only</span>. Registration and listings are <span className="font-medium text-foreground">100% free for now</span> — early businesses get priority placement.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="fullName" className="text-xs font-medium">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required className="mt-1" />
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-xs font-medium">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1" />
            {!isLogin && (
              <p className="text-[11px] text-muted-foreground mt-1">Please use a real email address.</p>
            )}
          </div>
          <div>
            <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="text-sm text-center mt-4 text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium">
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
