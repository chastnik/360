// Автор: Стас Чашин @chastnik
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    mattermost_username: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(formData);
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
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
            Регистрация
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Создайте аккаунт для участия в оценке
          </p>
        </div>

        {/* Форма регистрации */}
        <div className="bg-white dark:bg-dark-300 rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Email поле */}
            <div>
              <label htmlFor="email" className="label block mb-2">
                Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">📧</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="your.email@company.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Имя */}
            <div>
              <label htmlFor="first_name" className="label block mb-2">
                Имя *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">👤</span>
                </div>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Иван"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Фамилия */}
            <div>
              <label htmlFor="last_name" className="label block mb-2">
                Фамилия *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">👤</span>
                </div>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Иванов"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Отчество */}
            <div>
              <label htmlFor="middle_name" className="label block mb-2">
                Отчество
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">👤</span>
                </div>
                <input
                  id="middle_name"
                  name="middle_name"
                  type="text"
                  value={formData.middle_name}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Иванович"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Mattermost Username */}
            <div>
              <label htmlFor="mattermost_username" className="label block mb-2">
                Mattermost Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">💬</span>
                </div>
                <input
                  id="mattermost_username"
                  name="mattermost_username"
                  type="text"
                  value={formData.mattermost_username}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="@username"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Кнопка регистрации */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>

            {/* Ссылка на вход */}
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Уже есть аккаунт?{' '}
                <Link
                  to="/login"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Войти
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 