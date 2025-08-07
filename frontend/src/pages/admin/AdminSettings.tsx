import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface SystemSettings {
  general: {
    system_name: string;
    company_name: string;
    admin_email: string;
    default_language: string;
    timezone: string;
    allow_self_assessment: boolean;
    include_manager_assessment: boolean;
    default_respondent_count: number;
  };
  database: {
    db_host: string;
    db_port: number;
    db_name: string;
    db_user: string;
    db_password: string;
  };
  cache: {
    redis_enabled: boolean;
    redis_host: string;
    redis_port: number;
    redis_password: string;
    redis_db: number;
  };
  notifications: {
    email_notifications: boolean;
    mattermost_notifications: boolean;
    reminder_frequency: number;
    reminder_enabled: boolean;
    cycle_start_notifications: boolean;
    assessment_complete_notifications: boolean;
  };
  security: {
    session_timeout: number;
    password_min_length: number;
    require_password_change: boolean;
    password_change_days: number;
    enable_2fa: boolean;
    max_login_attempts: number;
    lockout_duration: number;
  };
}

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      system_name: 'Система 360° оценки',
      company_name: '',
      admin_email: '',
      default_language: 'ru',
      timezone: 'Europe/Moscow',
      allow_self_assessment: true,
      include_manager_assessment: true,
      default_respondent_count: 5
    },
    database: {
      db_host: 'localhost',
      db_port: 5432,
      db_name: 'assessment_db',
      db_user: 'postgres',
      db_password: ''
    },
    cache: {
      redis_enabled: true,
      redis_host: 'localhost',
      redis_port: 6379,
      redis_password: '',
      redis_db: 0
    },
    notifications: {
      email_notifications: true,
      mattermost_notifications: true,
      reminder_frequency: 7,
      reminder_enabled: true,
      cycle_start_notifications: true,
      assessment_complete_notifications: true
    },
    security: {
      session_timeout: 480,
      password_min_length: 8,
      require_password_change: false,
      password_change_days: 90,
      enable_2fa: false,
      max_login_attempts: 5,
      lockout_duration: 30
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'database' | 'cache' | 'notifications' | 'security'>('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      const data = response.data?.success ? response.data : response.data;
      
      if (data.success) {
        // Конвертируем данные API в формат компонента
        const apiSettings = data.settings;
        setSettings({
          general: {
            system_name: apiSettings.general?.system_name?.value || 'Система 360° оценки',
            company_name: apiSettings.general?.company_name?.value || '',
            admin_email: apiSettings.general?.admin_email?.value || '',
            default_language: 'ru',
            timezone: 'Europe/Moscow',
            allow_self_assessment: true,
            include_manager_assessment: true,
            default_respondent_count: 5
          },
          database: {
            db_host: apiSettings.database?.db_host?.value || 'localhost',
            db_port: apiSettings.database?.db_port?.value || 5432,
            db_name: apiSettings.database?.db_name?.value || 'assessment_db',
            db_user: apiSettings.database?.db_user?.value || 'postgres',
            db_password: apiSettings.database?.db_password?.value || ''
          },
          cache: {
            redis_enabled: apiSettings.cache?.redis_enabled?.value || true,
            redis_host: apiSettings.cache?.redis_host?.value || 'localhost',
            redis_port: apiSettings.cache?.redis_port?.value || 6379,
            redis_password: apiSettings.cache?.redis_password?.value || '',
            redis_db: apiSettings.cache?.redis_db?.value || 0
          },
          notifications: {
            email_notifications: apiSettings.notifications?.email_notifications?.value || true,
            mattermost_notifications: apiSettings.integrations?.mattermost_notifications?.value || true,
            reminder_frequency: 7,
            reminder_enabled: true,
            cycle_start_notifications: true,
            assessment_complete_notifications: true
          },
          security: {
            session_timeout: 480,
            password_min_length: 8,
            require_password_change: false,
            password_change_days: 90,
            enable_2fa: false,
            max_login_attempts: 5,
            lockout_duration: 30
          }
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
      setError('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const response = await api.put('/settings', { settings });
      const data = response.data?.success ? response.data : response.data;
      
      if (data.success) {
        setSuccessMessage('Настройки сохранены успешно');
      } else {
        setError(data.error || 'Не удалось сохранить настройки');
      }
    } catch (error: any) {
      console.error('Ошибка сохранения настроек:', error);
      setError(error.response?.data?.error || 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    if (!window.confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await api.post('/settings/reset');
      const data = response.data?.success ? response.data : response.data;
      if (data.success) {
        setSuccessMessage('Настройки сброшены к значениям по умолчанию');
        loadSettings();
      } else {
        setError(data.error || 'Не удалось сбросить настройки');
      }
    } catch (error: any) {
      console.error('Ошибка сброса настроек:', error);
      setError(error.response?.data?.error || 'Не удалось сбросить настройки');
    } finally {
      setSaving(false);
    }
  };

  const updateGeneralSettings = (field: keyof SystemSettings['general'], value: any) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [field]: value
      }
    }));
  };

  const updateNotificationSettings = (field: keyof SystemSettings['notifications'], value: any) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  const updateSecuritySettings = (field: keyof SystemSettings['security'], value: any) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [field]: value
      }
    }));
  };

  const updateDatabaseSettings = (field: keyof SystemSettings['database'], value: any) => {
    setSettings(prev => ({
      ...prev,
      database: {
        ...prev.database,
        [field]: value
      }
    }));
  };

  const updateCacheSettings = (field: keyof SystemSettings['cache'], value: any) => {
    setSettings(prev => ({
      ...prev,
      cache: {
        ...prev.cache,
        [field]: value
      }
    }));
  };

  // Тестирование подключения к базе данных
  const handleTestDatabaseConnection = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings/test-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          host: settings.database.db_host,
          port: settings.database.db_port,
          database: settings.database.db_name,
          username: settings.database.db_user,
          password: settings.database.db_password
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Подключение к базе данных успешно!');
      } else {
        setError(data.error || 'Не удалось подключиться к базе данных');
      }
    } catch (error: any) {
      console.error('Ошибка тестирования подключения к БД:', error);
      setError('Ошибка при тестировании подключения к базе данных');
    } finally {
      setSaving(false);
    }
  };

  // Тестирование подключения к Redis
  const handleTestRedisConnection = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings/test-redis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          host: settings.cache.redis_host,
          port: settings.cache.redis_port,
          password: settings.cache.redis_password,
          db: settings.cache.redis_db
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Подключение к Redis успешно!');
      } else {
        setError(data.error || 'Не удалось подключиться к Redis');
      }
    } catch (error: any) {
      console.error('Ошибка тестирования подключения к Redis:', error);
      setError('Ошибка при тестировании подключения к Redis');
    } finally {
      setSaving(false);
    }
  };

  // Очистка сообщений через 5 секунд
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Настройки системы
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Управление общими параметрами системы
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={handleResetSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сбросить
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Сообщения */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Вкладки */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Общие
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'database'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              База данных
            </button>
            <button
              onClick={() => setActiveTab('cache')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cache'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Кэширование
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Уведомления
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Безопасность
            </button>
          </nav>
        </div>

        <div className="px-4 py-5 sm:p-6">
          {/* Общие настройки */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Основные параметры
                </h3>
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Название системы
                    </label>
                    <input
                      type="text"
                      value={settings.general.system_name}
                      onChange={(e) => updateGeneralSettings('system_name', e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Название компании
                    </label>
                    <input
                      type="text"
                      value={settings.general.company_name}
                      onChange={(e) => updateGeneralSettings('company_name', e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email администратора
                    </label>
                    <input
                      type="email"
                      value={settings.general.admin_email}
                      onChange={(e) => updateGeneralSettings('admin_email', e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Часовой пояс
                    </label>
                    <select
                      value={settings.general.timezone}
                      onChange={(e) => updateGeneralSettings('timezone', e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="Europe/Moscow">Europe/Moscow</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                    </select>
                  </div>

                  <div className="sm:col-span-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">
                      Настройки оценки по умолчанию
                    </h4>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.general.allow_self_assessment}
                          onChange={(e) => updateGeneralSettings('allow_self_assessment', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                          Разрешить самооценку
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.general.include_manager_assessment}
                          onChange={(e) => updateGeneralSettings('include_manager_assessment', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                          Включать оценку руководителя
                        </label>
                      </div>

                      <div className="flex items-center space-x-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Количество респондентов по умолчанию:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={settings.general.default_respondent_count}
                          onChange={(e) => updateGeneralSettings('default_respondent_count', parseInt(e.target.value))}
                          className="w-20 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Настройки базы данных */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Настройки PostgreSQL
                  </h3>
                  <button
                    onClick={handleTestDatabaseConnection}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Тестировать подключение
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Хост базы данных
                    </label>
                    <input
                      type="text"
                      value={settings.database.db_host}
                      onChange={(e) => updateDatabaseSettings('db_host', e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="localhost"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Порт
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      value={settings.database.db_port}
                      onChange={(e) => updateDatabaseSettings('db_port', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="5432"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Имя базы данных
                    </label>
                    <input
                      type="text"
                      value={settings.database.db_name}
                      onChange={(e) => updateDatabaseSettings('db_name', e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="assessment_db"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Пользователь
                    </label>
                    <input
                      type="text"
                      value={settings.database.db_user}
                      onChange={(e) => updateDatabaseSettings('db_user', e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="postgres"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Пароль
                    </label>
                    <input
                      type="password"
                      value={settings.database.db_password}
                      onChange={(e) => updateDatabaseSettings('db_password', e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Введите пароль..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Настройки кэширования */}
          {activeTab === 'cache' && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Настройки Redis
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleTestRedisConnection}
                      disabled={saving || !settings.cache.redis_enabled}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Тестировать подключение
                    </button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.cache.redis_enabled}
                      onChange={(e) => updateCacheSettings('redis_enabled', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Включить Redis кэширование
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Хост Redis сервера
                      </label>
                      <input
                        type="text"
                        value={settings.cache.redis_host}
                        onChange={(e) => updateCacheSettings('redis_host', e.target.value)}
                        disabled={!settings.cache.redis_enabled}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        placeholder="localhost"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Порт
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        value={settings.cache.redis_port}
                        onChange={(e) => updateCacheSettings('redis_port', parseInt(e.target.value))}
                        disabled={!settings.cache.redis_enabled}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        placeholder="6379"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Пароль (опционально)
                      </label>
                      <input
                        type="password"
                        value={settings.cache.redis_password}
                        onChange={(e) => updateCacheSettings('redis_password', e.target.value)}
                        disabled={!settings.cache.redis_enabled}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        placeholder="Введите пароль..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Номер базы данных
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={settings.cache.redis_db}
                        onChange={(e) => updateCacheSettings('redis_db', parseInt(e.target.value))}
                        disabled={!settings.cache.redis_enabled}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Настройки уведомлений */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Настройки уведомлений
                </h3>
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notifications.email_notifications}
                        onChange={(e) => updateNotificationSettings('email_notifications', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Email уведомления
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notifications.mattermost_notifications}
                        onChange={(e) => updateNotificationSettings('mattermost_notifications', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Mattermost уведомления
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notifications.cycle_start_notifications}
                        onChange={(e) => updateNotificationSettings('cycle_start_notifications', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Уведомления о запуске циклов
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notifications.assessment_complete_notifications}
                        onChange={(e) => updateNotificationSettings('assessment_complete_notifications', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                        Уведомления о завершении оценки
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">
                      Настройки напоминаний
                    </h4>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.reminder_enabled}
                          onChange={(e) => updateNotificationSettings('reminder_enabled', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                          Включить напоминания
                        </label>
                      </div>

                      <div className="flex items-center space-x-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Частота напоминаний (дни):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={settings.notifications.reminder_frequency}
                          onChange={(e) => updateNotificationSettings('reminder_frequency', parseInt(e.target.value))}
                          className="w-20 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          disabled={!settings.notifications.reminder_enabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Настройки безопасности */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Настройки безопасности
                </h3>
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Время сессии (минуты)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="1440"
                        value={settings.security.session_timeout}
                        onChange={(e) => updateSecuritySettings('session_timeout', parseInt(e.target.value))}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Минимальная длина пароля
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="50"
                        value={settings.security.password_min_length}
                        onChange={(e) => updateSecuritySettings('password_min_length', parseInt(e.target.value))}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Максимальное количество попыток входа
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="10"
                        value={settings.security.max_login_attempts}
                        onChange={(e) => updateSecuritySettings('max_login_attempts', parseInt(e.target.value))}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Время блокировки (минуты)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={settings.security.lockout_duration}
                        onChange={(e) => updateSecuritySettings('lockout_duration', parseInt(e.target.value))}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">
                      Политика паролей
                    </h4>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.security.require_password_change}
                          onChange={(e) => updateSecuritySettings('require_password_change', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                          Требовать смену пароля
                        </label>
                      </div>

                      <div className="flex items-center space-x-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Смена пароля через (дни):
                        </label>
                        <input
                          type="number"
                          min="30"
                          max="365"
                          value={settings.security.password_change_days}
                          onChange={(e) => updateSecuritySettings('password_change_days', parseInt(e.target.value))}
                          className="w-20 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          disabled={!settings.security.require_password_change}
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.security.enable_2fa}
                          onChange={(e) => updateSecuritySettings('enable_2fa', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                          Включить двухфакторную аутентификацию
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings; 