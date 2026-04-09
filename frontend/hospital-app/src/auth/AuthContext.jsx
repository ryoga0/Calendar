import React, { createContext, useContext, useEffect, useState } from "react";
import { ensureFirebaseSessionPersistence } from "../firebase/client";
import { subscribeAuthState } from "../firebase/patientPortal";
import { logoutUser } from "../api/authApi";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    ensureFirebaseSessionPersistence()
      .then(() => {
        unsubscribe = subscribeAuthState({
          onSignedIn: (session) => {
            if (!active) {
              return;
            }
            setToken(session.access_token);
            setUser(session.user);
            setIsLoading(false);
          },
          onSignedOut: () => {
            if (!active) {
              return;
            }
            setToken(null);
            setUser(null);
            setIsLoading(false);
          },
          onError: () => {
            if (!active) {
              return;
            }
            setToken(null);
            setUser(null);
            setIsLoading(false);
          },
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setToken(null);
        setUser(null);
        setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = (session) => {
    setToken(session.access_token);
    setUser(session.user);
    setIsLoading(false);
  };

  const logout = async () => {
    await logoutUser();
    setToken(null);
    setUser(null);
    setIsLoading(false);
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
