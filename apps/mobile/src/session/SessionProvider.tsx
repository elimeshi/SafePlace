import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@safeplace/api-client";
import { supabase } from "@/lib/supabase";

interface SessionState {
  /** The active Supabase session, or null when signed out. */
  session: Session | null;
  /** Convenience accessor for the authenticated user. */
  user: User | null;
  /**
   * True until the persisted session has been read from storage on launch.
   * Routes must wait on this before deciding to gate — otherwise a signed-in
   * user briefly flashes the onboarding wizard on cold start.
   */
  initializing: boolean;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

/**
 * Owns auth/session state for the whole app. Reads any persisted session on
 * mount, then keeps it live via Supabase's onAuthStateChange (login, logout,
 * token refresh, and — with email confirmation ON — the transition to a
 * confirmed session). Mounted once at the router root; screens read it with
 * useSession() and never touch supabase.auth directly for state.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionState>(
    () => ({ session, user: session?.user ?? null, initializing }),
    [session, initializing]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (ctx === undefined) {
    throw new Error("useSession must be used within a <SessionProvider>.");
  }
  return ctx;
}
