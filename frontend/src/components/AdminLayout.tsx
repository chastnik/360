// Автор: Стас Чашин @chastnik
import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminNavigation = [
    {
      name: 'Пользователи',
      path: '/admin/users',
      icon: '👥'
    },
    {
      name: 'Отделы',
      path: '/admin/departments',
      icon: '🏢'
    },
    {
      name: 'Категории',
      path: '/admin/categories',
      icon: '🏷️'
    },
    {
      name: 'Вопросы',
      path: '/admin/questions',
      icon: '❓'
    },
    {
      name: 'Mattermost',
      path: '/admin/mattermost',
      icon: '💬'
    },
    {
      name: 'Настройки',
      path: '/admin/settings',
      icon: '⚙️'
    },
    {
      name: 'Роли',
      path: '/admin/roles',
      icon: '🛡️'
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

  const mainNavigation = [
    { name: 'Дашборд', href: '/dashboard', icon: '📊' },
    { name: 'Циклы', href: '/cycles', icon: '🔄' },
    { name: 'Оценки', href: '/assessments', icon: '📝' },
    { name: 'Отчеты', href: '/reports', icon: '📈' },
    { name: 'Профиль', href: '/profile', icon: '👤' }
  ];

  const isMainActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Верхняя основная навигация */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white">
                  360° Оценка
                </Link>
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                {mainNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isMainActive(item.href)
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
              {/* Ссылка на админку - активна */}
              <span className="border-primary-500 text-primary-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                ⚙️ Администрирование
              </span>
              
              {/* Информация о пользователе */}
              <div className="flex items-center">
                <span className="text-sm text-gray-700 dark:text-gray-300 mr-3">
                  {user.first_name} {user.last_name}
                </span>
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
      {/* Мобильное меню */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Закрыть меню</span>
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="px-4">
              <Link 
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className="block hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md p-2 -m-2 transition-colors"
              >
                <h2 className="text-lg font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">
                  Администрирование
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Система 360° оценки
                </p>
              </Link>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {adminNavigation.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`${
                    isActive(item.path)
                      ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Основной контент area с боковой панелью */}
      <div className="flex-1 flex">
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
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">
                      Администрирование
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Система 360° оценки
                    </p>
                  </Link>
                </div>
                <nav className="mt-5 flex-1 px-2 space-y-1">
                  {adminNavigation.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`${
                        isActive(item.path)
                          ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
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
        <div className="flex flex-col flex-1">
          {/* Кнопка меню для мобильных устройств */}
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 lg:hidden">
            <button
              type="button"
              className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Открыть меню</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

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