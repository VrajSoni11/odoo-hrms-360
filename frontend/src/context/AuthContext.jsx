import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const { data } = await client.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    client.post("/auth/logout").catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refresh: bootstrap }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
