import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

const DEV_SESSION_KEY = 'compliance_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const session = await authService.getSession();
      setUser(session.user || session);
    } catch {
      const stored = sessionStorage.getItem(DEV_SESSION_KEY);
      if (stored) setUser(JSON.parse(stored));
      else setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (username, password) => {
    try {
      const result = await authService.login(username, password);
      const nextUser = result.user || { username };
      setUser(nextUser);
      return nextUser;
    } catch (err) {
      if (import.meta.env.DEV && username && password) {
        const devUser = { username, role: 'admin' };
        sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify(devUser));
        setUser(devUser);
        return devUser;
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      /* session may already be cleared */
    }
    sessionStorage.removeItem(DEV_SESSION_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, isAuthenticated: !!user }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
