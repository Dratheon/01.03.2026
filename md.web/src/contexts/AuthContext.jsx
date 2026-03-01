import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getMe, isAuthenticated, getCurrentUser } from '../services/dataService';

const AuthContext = createContext(null);

/**
 * Permission kontrolü için helper function
 * @param {Array} userPermissions - Kullanıcının permission listesi
 * @param {string} required - Gerekli permission (örn: "jobs.view", "finance.*")
 * @returns {boolean}
 */
export const checkPermission = (userPermissions = [], userRole = 'user', required) => {
  // Admin her şeyi yapabilir (geriye uyumluluk)
  if (userRole === 'admin') return true;
  
  // Tüm yetkiler
  if (userPermissions.includes('*')) return true;
  
  // Doğrudan eşleşme
  if (userPermissions.includes(required)) return true;
  
  // Wildcard kontrolü: "jobs.*" → "jobs.view", "jobs.create" vb. eşleşir
  const requiredParts = required.split('.');
  for (const perm of userPermissions) {
    if (perm.endsWith('.*')) {
      const permBase = perm.slice(0, -2); // "jobs.*" → "jobs"
      if (required.startsWith(permBase + '.') || required === permBase) {
        return true;
      }
    }
  }
  
  return false;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sayfa yüklendiğinde session kontrol et
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    try {
      if (isAuthenticated()) {
        const response = await getMe();
        if (response.authenticated && response.user) {
          setUser(response.user);
        } else {
          // Token geçersiz
          setUser(null);
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiLogin(username, password);
      if (response.success) {
        setUser(response.user);
        return { success: true };
      } else {
        setError(response.message || 'Giriş başarısız');
        return { success: false, message: response.message };
      }
    } catch (err) {
      const message = err.message || 'Giriş sırasında hata oluştu';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  // Kullanıcının belirli bir yetkiye sahip olup olmadığını kontrol et
  const hasPermission = useCallback((required) => {
    if (!user) return false;
    return checkPermission(user.permissions || [], user.role || 'user', required);
  }, [user]);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
