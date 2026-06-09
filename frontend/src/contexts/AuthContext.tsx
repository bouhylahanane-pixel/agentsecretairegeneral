import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

export type UserRole = "admin" | "secretaire" | "employee" | "stagiaire";

export type CurrentUser = {
  id?: number;
  nom?: string;
  name?: string;
  email: string;
  role: UserRole;
  departement?: string;
};

type AuthContextType = {
  user: CurrentUser | null;
  token: string | null;
  login: (userData: CurrentUser, token: string) => void;
  logout: () => void;
  testSwitchRole: (newRole: UserRole) => void;
  loading: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      window.location.href = '/login';
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const data = await authApi.getMe();
          setUser(data.user);
        } catch (error) {
          console.error("Erreur de vérification du token", error);
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const login = (userData: CurrentUser, newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const testSwitchRole = (newRole: UserRole) => {
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, testSwitchRole, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
