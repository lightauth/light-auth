"use client";

import { DEFAULT_BASE_PATH, type LightAuthSession } from "@light-auth/core";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface SessionContextProps {
  session: LightAuthSession | null;
  loading: boolean;
  refresh: () => void;
}

export const SessionContext = createContext?.<SessionContextProps | undefined>(undefined);

export const useSession = (is_required = false) => {
  if (!SessionContext) {
    throw new Error("light-auth: React Context is unavailable in Server Components");
  }

  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("light-auth: `useSession` must be wrapped in a <SessionProvider />");
  }

  useEffect(() => {
    if (context.session === null && is_required) {
      const url = `/signin?${new URLSearchParams({
        error: "SessionRequired",
        callbackUrl: window.location.href,
      })}`;
      window.location.href = url;
    }
  }, [context.session]);
  return context;
};

async function fetchSession(endpoint: string): Promise<LightAuthSession | null> {
  // This endpoint should return session info based on cookies
  try {
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Error fetching session:", error);
    return null;
  }
}

export interface SessionProviderProps {
  children: ReactNode;
  interval_ms?: number; // How often to refresh session (default: 5 min)
  refresh_on_window_focus?: boolean;
  refresh_on_online?: boolean;
  base_path?: string; // Optional session endpoint
}

export const SessionProvider = ({
  children,
  interval_ms = 5 * 60 * 1000,
  refresh_on_window_focus = true,
  refresh_on_online = true,
  base_path = DEFAULT_BASE_PATH,
}: SessionProviderProps) => {
  if (!SessionContext) {
    throw new Error("light-auth: React Context is unavailable in Server Components");
  }

  const [sessionState, setSessionState] = useState<LightAuthSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const getSession = async () => {
    if (!isOnline) return;
    setLoading(true);

    try {
      const data = await fetchSession(`${base_path}/session`);
      setSessionState(data);
    } catch (error) {
      console.error("Error fetching session:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getSession();
    const interval = setInterval(getSession, interval_ms);

    let removeListeners: (() => void) | undefined;

    if (typeof window !== "undefined") {
      const listeners: Array<[string, EventListenerOrEventListenerObject]> = [];

      if (refresh_on_window_focus) {
        const handleFocus = () => getSession();
        window.addEventListener("focus", handleFocus);
        listeners.push(["focus", handleFocus]);
      }

      if (refresh_on_online) {
        const handleOnline = () => {
          setIsOnline(true);
          getSession();
        };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        listeners.push(["online", handleOnline], ["offline", handleOffline]);
      }

      removeListeners = () => {
        listeners.forEach(([event, handler]) => window.removeEventListener(event, handler));
      };
    }

    return () => {
      clearInterval(interval);
      if (removeListeners) removeListeners();
    };
  }, [interval_ms, isOnline, refresh_on_window_focus, refresh_on_online]);

  return <SessionContext.Provider value={{ session: sessionState, loading, refresh: getSession }}>{children}</SessionContext.Provider>;
};
