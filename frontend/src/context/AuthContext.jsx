import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth by calling a protected endpoint; if 401 we're not logged in
    api
      .getPastChats()
      .then(() => setUser({ loggedIn: true }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setUser({ ...data.response, loggedIn: true });
    return data;
  };

  const signup = async (body) => {
    const data = await api.signup(body);
    setUser({ ...data.response, loggedIn: true });
    return data;
  };

  const logout = async () => {
    setUser(null);
    // Backend uses httpOnly cookie; redirect or clear client state only
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
