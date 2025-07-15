import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'user';
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

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
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
            <p className="text-xl text-gray-600 mb-8">Доступ запрещен</p>
            <p className="text-gray-500">У вас нет прав для просмотра этой страницы</p>
          </div>
        </div>
      );
    }
    
    // Для других ролей перенаправляем на дашборд
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}; 