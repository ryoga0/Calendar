import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(sessionStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(sessionStorage.getItem("token")));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    apiFetch("/users/me", "GET", null, token)
      .then((me) => {
        if (active) {
          setUser(me);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }
        sessionStorage.removeItem("token");
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const login = (data) => {
    setToken(data.access_token);
    setUser(data.user);
    setIsLoading(false);
    sessionStorage.setItem("token", data.access_token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsLoading(false);
    sessionStorage.removeItem("token");
  };

  const refreshUser = (nextUser) => {
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
