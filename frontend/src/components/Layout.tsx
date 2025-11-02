
// Автор: Стас Чашин @chastnik
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Avatar from './Avatar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, permissions } = useAuth();
  const { themeMode, setThemeMode, theme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const can = (perm?: string) => !perm || permissions.includes(perm);
  const navigation = [
    { name: 'Дашборд', href: '/dashboard', icon: '📊' },
    { name: 'Циклы', href: '/cycles', icon: '🔄', perm: 'ui:view:cycles' },
    { name: 'Оценки', href: '/assessments', icon: '📝', perm: 'ui:view:assessments' },
    { name: 'Отчеты', href: '/reports', icon: '📈', perm: 'ui:view:reports' },
    { name: 'Обучение', href: '/learning', icon: '🎓', perm: 'ui:view:learning' },
    { name: 'Сотрудники', href: '/employees', icon: '👥', perm: 'ui:view:dashboard' },
    { name: 'Профиль', href: '/profile', icon: '👤' }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  // Закрытие выпадающих меню при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const handleProfileClick = () => {
    setProfileMenuOpen(!profileMenuOpen);
    setThemeMenuOpen(false);
  };

  const handleThemeClick = () => {
    setThemeMenuOpen(!themeMenuOpen);
    setProfileMenuOpen(false);
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
  };

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
                  to="/dashboard"
                  onClick={() => setSidebarOpen(false)}
                  className="block"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    360° Оценка
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Система оценки сотрудников
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
                {navigation.filter(i => can(i.perm)).map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`${
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
              
              {/* Информация о пользователе в мобильном меню */}
              <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setSidebarOpen(false);
                    }}
                    className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Выйти
                  </button>
                </div>
              </div>
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
                    to="/dashboard"
                    className="block hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md p-2 -m-2 transition-colors"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      360° Оценка
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Система оценки сотрудников
                    </p>
                  </Link>
                </div>
                <nav className="mt-5 flex-1 px-2 space-y-1">
                  {navigation.filter(i => can(i.perm)).map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive(item.href)
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
          {/* Верхняя панель с кнопкой меню и информацией пользователя */}
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className="px-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Открыть меню</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex-1 flex justify-end px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                {/* Ссылка на админку для администраторов */}
                {user?.role === 'admin' && permissions.includes('ui:view:admin') && (
                  <Link
                    to="/admin"
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    title="Администрирование"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                )}

                {/* Переключатель темы */}
                <div className="relative" ref={themeMenuRef}>
                  <button
                    onClick={handleThemeClick}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    title="Переключить тему"
                  >
                    {theme === 'light' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                  </button>

                  {/* Выпадающее меню темы */}
                  {themeMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                      <button
                        onClick={() => {
                          setThemeMode('auto');
                          setThemeMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          themeMode === 'auto' ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Авто (по системе)
                        {themeMode === 'auto' && (
                          <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setThemeMode('light');
                          setThemeMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          themeMode === 'light' ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Светлая
                        {themeMode === 'light' && (
                          <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setThemeMode('dark');
                          setThemeMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          themeMode === 'dark' ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        Тёмная
                        {themeMode === 'dark' && (
                          <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Меню профиля */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <div className="relative">
                      <Avatar 
                        userId={user?.id || ''} 
                        size={36}
                        fallback={
                          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-medium">
                            {getInitials()}
                          </div>
                        }
                      />
                    </div>
                  </button>

                  {/* Выпадающее меню профиля */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user?.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setProfileMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Профиль
                        </Link>
                        {user?.role === 'admin' && permissions.includes('ui:view:admin') && (
                          <Link
                            to="/admin"
                            onClick={() => setProfileMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Администрирование
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Выйти
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Контент страницы */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}; 