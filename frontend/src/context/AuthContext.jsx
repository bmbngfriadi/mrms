import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { userHasPermission } from '../utils/permissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mrms_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('mrms_token') || null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('mrms_theme');
      if (saved) return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
      localStorage.setItem('mrms_theme', theme);
    } catch (e) {
      console.error('Failed to sync theme:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          localStorage.setItem('mrms_user', JSON.stringify(res.data.data.user));
        } catch {
          setUser(null);
          setToken(null);
          localStorage.removeItem('mrms_token');
          localStorage.removeItem('mrms_user');
        }
      }
      setLoading(false);
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('mrms_token', newToken);
    localStorage.setItem('mrms_user', JSON.stringify(newUser));
    return newUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('mrms_token');
      localStorage.removeItem('mrms_user');
    }
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem('mrms_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        loading,
        theme,
        toggleTheme,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isHRGA: user?.role === 'HRGA' || user?.role === 'ADMIN',
        hasPermission: (permId) => userHasPermission(user, permId),
        canAccess: (menuId) => userHasPermission(user, menuId),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

