import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vml_token') || null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await authApi.getProfile();
      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to load profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const passwordLogin = async (username, password) => {
    const res = await authApi.login(username, password);
    const { access, refresh, user: userData } = res.data;
    localStorage.setItem('vml_token', access);
    if (refresh) {
      localStorage.setItem('vml_refresh_token', refresh);
    }
    setToken(access);
    setUser(userData);
    return userData;
  };

  const quickLogin = async (role) => {
    const res = await authApi.quickLogin(role);
    const { access, refresh, user: userData } = res.data;
    localStorage.setItem('vml_token', access);
    if (refresh) {
      localStorage.setItem('vml_refresh_token', refresh);
    }
    setToken(access);
    setUser(userData);
    return userData;
  };

  const updateProfile = async (data) => {
    const res = await authApi.updateProfile(data);
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('vml_token');
    localStorage.removeItem('vml_refresh_token');
    setToken(null);
    setUser(null);
  };

  const login = passwordLogin;
  const refreshProfile = fetchProfile;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        passwordLogin,
        quickLogin,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
