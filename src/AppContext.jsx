import React from "react";
import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext(null);

// DEV: set VITE_BYPASS_AUTH=true in a Vite env file (e.g. .env.local) to auto-login as a dev user
const DEV_BYPASS = Boolean(import.meta.env.VITE_BYPASS_AUTH);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) return JSON.parse(storedUser);

    // If bypass enabled, return a lightweight dev user so routes render without signing in
    if (DEV_BYPASS) {
      const devUser = { username: "dev", firstName: "Dev", lastName: "User", email: "dev@example.com" };
      try { localStorage.setItem("user", JSON.stringify(devUser)); } catch (e) { /* ignore */ }
      return devUser;
    }

    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <AppContext.Provider value={{ user, setUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}