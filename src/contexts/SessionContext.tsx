import React, { createContext, useContext, useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { showLoading, dismissToast, showError } from "@/utils/toast";
import { Loader2 } from "lucide-react"; // Import Loader2

interface SessionContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        navigate("/login");
        dismissToast("auth-loading");
      } else if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        if (location.pathname === "/login" || location.pathname === "/register") {
          navigate("/");
        }
        dismissToast("auth-loading");
      } else {
        setSession(null);
        setUser(null);
        if (location.pathname !== "/register") {
          navigate("/login");
        }
        dismissToast("auth-loading");
      }
      setLoading(false);
    });

    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        showError(error.message);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);

      if (!session && location.pathname !== "/register") {
        navigate("/login");
      } else if (session && (location.pathname === "/login" || location.pathname === "/register")) {
        navigate("/");
      }
    };

    getSession();

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    // Render a loading spinner instead of null to prevent a white screen
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4 mx-auto" />
          <p className="text-lg text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ session, user, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionContextProvider");
  }
  return context;
};