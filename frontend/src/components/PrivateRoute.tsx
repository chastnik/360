
// Автор: Стас Чашин @chastnik
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ForbiddenPage } from '../pages/ForbiddenPage';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'user' | 'hr';
  requiredPermission?: string;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  requiredRole,
  requiredPermission
}) => {
  const { isAuthenticated, user, isLoading, permissions } = useAuth();

  // Показываем загрузку, пока проверяем авторизацию
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  // Если не авторизован, перенаправляем на логин
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Если требуется определенная роль, проверяем её
  if (requiredRole && user?.role !== requiredRole) {
    // Для админских страниц показываем 403
    if (requiredRole === 'admin') {
      return <ForbiddenPage />;
    }
    
    // Для других ролей перенаправляем на мой дашборд
    return <Navigate to="/my-dashboard" replace />;
  }

  // Если требуется конкретное право, проверяем его
  if (requiredPermission) {
    // Если permissions еще не загружены, ждем
    if (isLoading || permissions === undefined) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      );
    }
    
    const has = Array.isArray(permissions) && permissions.includes(requiredPermission);
    if (!has) {
      return <ForbiddenPage />;
    }
  }

  return <>{children}</>;
}; 