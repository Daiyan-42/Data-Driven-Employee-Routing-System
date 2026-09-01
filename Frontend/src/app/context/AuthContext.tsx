import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../data/mockData";

const USER_STORAGE_KEY = "auth_user";
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// A stored session is only usable while the access token is still valid.
// Decode the JWT's `exp` claim (seconds since epoch) client-side so a dead
// session is dropped on boot instead of showing a stale dashboard.
const isTokenExpired = (token: string): boolean => {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return true;
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      // Only restore the session if we have BOTH the user object and a token
      // that hasn't expired. Otherwise it's a stale session and we're logged out.
      if (!stored || !token || isTokenExpired(token)) return null;
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });

  // If the boot-time check above decided the stored session was stale, purge
  // the leftover keys so the next sign-in starts from a clean slate.
  useEffect(() => {
    if (!user && localStorage.getItem(USER_STORAGE_KEY) !== null) {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }, [user]);

  // React to a dead token detected anywhere in the app (401 responses): drop
  // the user from state so ProtectedRoute sends us to /login.
  useEffect(() => {
    const onSessionExpired = () => setUser(null);
    window.addEventListener("auth:session-expired", onSessionExpired);
    return () => window.removeEventListener("auth:session-expired", onSessionExpired);
  }, []);

  const login = (user: User) => {
    setUser(user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
