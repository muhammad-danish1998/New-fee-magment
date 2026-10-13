import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial stored session
    const current = authService.getCurrentUser();
    setUser(current);
    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    const sessionUser = await authService.login(identifier, password);
    setUser(sessionUser);
    return sessionUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateCredentials = async (updateData) => {
    const updatedUser = await authService.updateCredentials({
      ...updateData,
      id: user?.id
    });
    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateCredentials }}>
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
