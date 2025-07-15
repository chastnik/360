import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, isAuthenticated } = useAuth();

  // Если уже авторизован, перенаправляем на dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-100 dark:to-dark-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Логотип и заголовок */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl text-white">🏢</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            360° Оценка
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Система оценки персонала
          </p>
        </div>

        {/* Форма входа */}
        <div className="card p-8 shadow-large">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Email поле */}
            <div>
              <label htmlFor="email" className="label block mb-2">
                Email
              </label>
              <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">📧</span>
            </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="your.email@company.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password поле */}
            <div>
              <label htmlFor="password" className="label block mb-2">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔒</span>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Введите пароль"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <span className="text-gray-400 hover:text-gray-600">🙈</span>
                  ) : (
                    <span className="text-gray-400 hover:text-gray-600">👁️</span>
                  )}
                </button>
              </div>
            </div>

            {/* Кнопка входа */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full btn-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner w-5 h-5 mr-2"></div>
                  Вход...
                </div>
              ) : (
                'Войти'
              )}
            </button>

            {/* Ссылка на регистрацию */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Нет аккаунта?{' '}
                <Link 
                  to="/register" 
                  className="text-primary-600 hover:text-primary-500 font-medium"
                >
                  Зарегистрироваться
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Дополнительная информация */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            © 2024 360° Assessment System. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  );
}; 