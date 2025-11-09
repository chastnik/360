
// Автор: Стас Чашин @chastnik
import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, permissions } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const can = (perm?: string) => !perm || permissions.includes(perm);
  const adminNavigation = [
    {
      name: 'Пользователи',
      path: '/admin/users',
      icon: '👥',
      perm: 'ui:view:admin.users'
    },
    {
      name: 'Отделы',
      path: '/admin/departments',
      icon: '🏢',
      perm: 'ui:view:admin.departments'
    },
    {
      name: 'Категории',
      path: '/admin/categories',
      icon: '🏷️',
      perm: 'ui:view:admin.categories'
    },
    {
      name: 'Вопросы',
      path: '/admin/questions',
      icon: '❓',
      perm: 'ui:view:admin.questions'
    },
    {
      name: 'Mattermost',
      path: '/admin/mattermost',
      icon: '💬',
      perm: 'ui:view:admin.mattermost'
    },
    {
      name: 'Настройки',
      path: '/admin/settings',
      icon: '⚙️',
      perm: 'ui:view:admin.settings'
    },
    {
      name: 'Роли',
      path: '/admin/roles',
      icon: '🛡️',
      perm: 'ui:view:admin.roles'
    },
    {
      name: 'Компетенции',
      path: '/admin/competencies',
      icon: '🧠',
      perm: 'ui:view:admin.competencies'
    },
    {
      name: 'Календарь',
      path: '/admin/calendar',
      icon: '📅',
      perm: undefined
    },
    {
      name: 'Логи',
      path: '/admin/logs',
      icon: '📋',
      perm: 'ui:view:admin.logs'
    }
  ];

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Доступ запрещен
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              У вас нет прав доступа к административной панели
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // основная навигация управляется на уровне Layout/Router

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Мобильное меню (overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Затемненный фон */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
            onClick={() => setSidebarOpen(false)} 
          />
          {/* Само меню */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex flex-col h-full">
              {/* Заголовок с кнопкой закрытия */}
              <div className="flex items-center justify-between px-4 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
                <Link 
                  to="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="block"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Администрирование
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Система 360° оценки
                  </p>
                </Link>
                <button
                  type="button"
                  className="flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Закрыть меню</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Навигация */}
              <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
                {adminNavigation.filter(i => can(i.perm)).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`${
                      isActive(item.path)
                        ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Основной layout с боковым меню */}
      <div className="flex flex-1">
        {/* Боковая панель для десктопа */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-1 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="px-4">
                  <Link 
                    to="/admin"
                    className="block hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md p-2 -m-2 transition-colors"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Администрирование
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Система 360° оценки
                    </p>
                  </Link>
                </div>
                <nav className="mt-5 flex-1 px-2 space-y-1">
                  {adminNavigation.filter(i => can(i.perm)).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`${
                        isActive(item.path)
                          ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                      } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Основной контент */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Контент страницы */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children || <Outlet />}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout; 