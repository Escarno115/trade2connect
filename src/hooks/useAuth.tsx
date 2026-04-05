import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const roleRequestId = useRef(0);

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data?.role ?? "customer";
    } catch {
      return "customer";
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const resolveRole = (userId: string) => {
      const requestId = ++roleRequestId.current;
      setLoading(true);
      setUserRole(null);

      void fetchRole(userId).then((role) => {
        if (!mounted || roleRequestId.current !== requestId) return;
        setUserRole(role);
        setLoading(false);
      });
    };

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        roleRequestId.current += 1;
        setUserRole(null);
        setLoading(false);
        return;
      }

      resolveRole(nextSession.user.id);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      applySession(currentSession);
    });

    return () => {
      mounted = false;
      roleRequestId.current += 1;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
