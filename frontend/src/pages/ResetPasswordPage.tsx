
// Автор: Стас Чашин @chastnik
import React, { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const { isAuthenticated } = useAuth();

  // Если уже авторизован, перенаправляем на dashboard
  if (isAuthenticated) {
    return <Navigate to="/my-dashboard" replace />;
  }

  // Если нет токена, перенаправляем на страницу входа
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Проверка совпадения паролей
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    // Проверка длины пароля
    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.resetPassword(token, password);
      
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error || 'Произошла ошибка');
      }
    } catch (err: any) {
      setError('Произошла ошибка при сбросе пароля');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-100 dark:to-dark-200 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Логотип и заголовок */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl text-white">✅</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Пароль сброшен
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Ваш пароль успешно изменен
            </p>
          </div>

          {/* Сообщение об успехе */}
          <div className="card p-8 shadow-large">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-600 dark:text-green-400">
                Пароль успешно сброшен. Теперь вы можете войти в систему с новым паролем.
              </p>
            </div>

            <div className="text-center">
              <Link 
                to="/login" 
                className="btn btn-primary w-full"
              >
                Войти в систему
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-dark-100 dark:to-dark-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Логотип и заголовок */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl text-white">🔑</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Новый пароль
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Введите новый пароль для вашего аккаунта
          </p>
        </div>

        {/* Форма сброса пароля */}
        <div className="card p-8 shadow-large">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Новый пароль */}
            <div>
              <label htmlFor="password" className="label block mb-2">
                Новый пароль
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
                  placeholder="Введите новый пароль"
                  required
                  disabled={isLoading}
                  minLength={6}
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

            {/* Подтверждение пароля */}
            <div>
              <label htmlFor="confirmPassword" className="label block mb-2">
                Подтвердите пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔒</span>
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Повторите новый пароль"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <span className="text-gray-400 hover:text-gray-600">🙈</span>
                  ) : (
                    <span className="text-gray-400 hover:text-gray-600">👁️</span>
                  )}
                </button>
              </div>
            </div>

            {/* Кнопка сброса */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full btn-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner w-5 h-5 mr-2"></div>
                  Сохранение...
                </div>
              ) : (
                'Сбросить пароль'
              )}
            </button>

            {/* Ссылка на вход */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Вспомнили пароль?{' '}
                <Link 
                  to="/login" 
                  className="text-primary-600 hover:text-primary-500 font-medium"
                >
                  Войти
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Дополнительная информация */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            © 2025 360° Assessment System. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  );
};
