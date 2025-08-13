// Автор: Стас Чашин @chastnik
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, permissions } = useAuth();
  const location = useLocation();

  const can = (perm?: string) => !perm || permissions.includes(perm);
  const navigation = [
    { name: 'Дашборд', href: '/dashboard', icon: '📊' },
    { name: 'Циклы', href: '/cycles', icon: '🔄', perm: 'ui:view:cycles' },
    { name: 'Оценки', href: '/assessments', icon: '📝', perm: 'ui:view:assessments' },
    { name: 'Отчеты', href: '/reports', icon: '📈', perm: 'ui:view:reports' },
    { name: 'Структура', href: '/structure', icon: '🏢', perm: 'ui:view:dashboard' },
    { name: 'Профиль', href: '/profile', icon: '👤' }
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Верхняя навигация */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white">
                  360° Оценка
                </Link>
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                {navigation.filter(i=>can(i.perm)).map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
              {/* Ссылка на админку для администраторов */}
              {user?.role === 'admin' && permissions.includes('ui:view:admin') && (
                <Link
                  to="/admin"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium"
                >
                  ⚙️ Администрирование
                </Link>
              )}
              
              {/* Информация о пользователе */}
              <div className="flex items-center">
                <button
                  onClick={() => logout()}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}; 