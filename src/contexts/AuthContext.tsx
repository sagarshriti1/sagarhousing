import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = 'admin' | 'realtor' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  realtorExpired: boolean;
  realtorId: string | null;
  refreshRealtorStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  realtorExpired: false,
  realtorId: null,
  refreshRealtorStatus: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [realtorExpired, setRealtorExpired] = useState(false);
  const [realtorId, setRealtorId] = useState<string | null>(null);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase.rpc('get_user_role', { _user_id: userId });
    const userRole = (data as AppRole) ?? 'user';
    setRole(userRole);

    if (userRole === 'realtor') {
      await checkRealtorExpiration(userId);
    }
  };

  const checkRealtorExpiration = async (userId: string) => {
    const { data } = await supabase
      .from('realtors')
      .select('id, expiration_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setRealtorId(data.id);
      if (data.expiration_date) {
        const expired = new Date(data.expiration_date) < new Date();
        setRealtorExpired(expired);
      }
    }
  };

  const refreshRealtorStatus = async () => {
    if (user) {
      await checkRealtorExpiration(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchRole(session.user.id), 0);
      } else {
        setRole(null);
        setRealtorExpired(false);
        setRealtorId(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, realtorExpired, realtorId, refreshRealtorStatus, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
