import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "staff" | "customer";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    // Subscribe FIRST, then read existing session — avoids race condition.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (!newSession) {
        setRoles([]);
        setRolesLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRoles([]);
      setRolesLoading(false);
      return;
    }
    setRolesLoading(true);
    // Defer to avoid blocking the auth callback.
    setTimeout(async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!cancelled) {
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setRolesLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
    };
  }, [user]);

  const value: AuthContextValue = {
    user,
    session,
    roles,
    loading: loading || (!!user && rolesLoading),
    hasRole: (role) => roles.includes(role),
    isStaff: roles.some((r) => r === "admin" || r === "manager" || r === "staff"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
