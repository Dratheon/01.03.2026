import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, checkPermission } from '../contexts/AuthContext';
import Loader from './Loader';
import { StatusIcon } from '../utils/muiIcons';

const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Yükleniyor
  if (loading) {
    return (
      <div className="protected-loading">
        <Loader text="Yetki kontrol ediliyor..." />
      </div>
    );
  }

  // Giriş yapılmamış
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rol kontrolü
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user?.role)) {
      return (
        <div className="access-denied">
          <div className="access-denied-content">
            <StatusIcon icon="block" style={{ fontSize: 64, color: 'var(--color-danger)', marginBottom: 16 }} />
            <h2>Erişim Engellendi</h2>
            <p>Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
            <p className="access-denied-role">Gerekli rol: {allowedRoles.join(' veya ')}</p>
          </div>
        </div>
      );
    }
  }

  // Permission kontrolü - wildcard destekli
  if (requiredPermission) {
    const userPermissions = user?.permissions || [];
    const userRole = user?.role || 'user';
    
    // checkPermission fonksiyonunu kullan (wildcard desteği var)
    const hasPermission = Array.isArray(requiredPermission)
      ? requiredPermission.some((p) => checkPermission(userPermissions, userRole, p))
      : checkPermission(userPermissions, userRole, requiredPermission);
    
    if (!hasPermission) {
      return (
        <div className="access-denied">
          <div className="access-denied-content">
            <StatusIcon icon="lock" style={{ fontSize: 64, color: 'var(--color-warning)', marginBottom: 16 }} />
            <h2>Erişim Engellendi</h2>
            <p>Bu sayfa için gerekli izniniz bulunmamaktadır.</p>
            <p style={{ marginTop: 16 }}>
              <a href="/dashboard" style={{ color: 'var(--color-primary)' }}>
                ← Kontrol Paneline Dön
              </a>
            </p>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
