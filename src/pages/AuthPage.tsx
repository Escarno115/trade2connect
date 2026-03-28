import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Wrench } from "lucide-react";

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const initialRole = searchParams.get("role") ?? "customer";

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<"customer" | "business">(initialRole as any);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect already-authenticated users based on role
  useEffect(() => {
    if (!authLoading && user) {
      if (userRole === "business") {
        navigate("/dashboard", { replace: true });
      } else if (userRole === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
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
        // Navigate immediately; useEffect will also handle it once role loads
        navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created! You're all set.");
        // Navigate based on selected role immediately
        navigate(role === "business" ? "/dashboard" : "/", { replace: true });
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
          <span className="text-xl font-bold">TradeHub</span>
        </div>

        <h1 className="text-2xl font-bold">{isLogin ? "Welcome back" : "Create account"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLogin ? "Sign in to continue" : "Join as a customer or business"}
        </p>

        {!isLogin && (
          <div className="flex gap-2 mt-4">
            {(["customer", "business"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors active-scale",
                  role === r ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
                )}
              >
                {r === "customer" ? "Customer" : "Business"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="fullName" className="text-xs font-medium">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-xs font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="mt-1"
            />
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
