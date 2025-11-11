
// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface JiraSettings {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
  projectKey: string;
  epicKey: string;
}

interface JiraConnectionStatus {
  connected: boolean;
  message?: string;
}

export const AdminJira: React.FC = () => {
  const [settings, setSettings] = useState<JiraSettings>({
    url: '',
    username: '',
    password: '',
    enabled: false,
    projectKey: '',
    epicKey: ''
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<JiraConnectionStatus | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/jira/settings');
      const data = response.data?.success ? response.data.data : response.data;
      
      if (data) {
        setSettings({
          url: data.url || '',
          username: data.username || '',
          password: data.password ? '••••••••' : '', // Маскируем пароль
          enabled: data.enabled ?? false,
          projectKey: data.projectKey || '',
          epicKey: data.epicKey || ''
        });
      }
      
      // Загружаем проекты и эпики если интеграция включена
      if (data?.enabled && data?.url && data?.username && data?.password) {
        loadProjects();
      }
    } catch (error: any) {
      console.error('Ошибка загрузки настроек Jira:', error);
      setError(error.response?.data?.error || 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await api.get('/jira/projects');
      const data = response.data?.success ? response.data.data : response.data;
      setProjects(Array.isArray(data) ? data : []);
      
      // Если выбран проект, загружаем эпики
      if (settings.projectKey) {
        loadEpics(settings.projectKey);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки проектов:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadEpics = async (projectKey: string) => {
    if (!projectKey) {
      setEpics([]);
      return;
    }
    try {
      const response = await api.get(`/jira/projects/${projectKey}/epics`);
      const data = response.data?.success ? response.data.data : response.data;
      setEpics(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Ошибка загрузки эпиков:', error);
      setEpics([]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Валидация
      if (!settings.url || !settings.url.trim()) {
        setError('Укажите адрес Jira сервера');
        return;
      }

      if (!settings.username || !settings.username.trim()) {
        setError('Укажите имя пользователя');
        return;
      }

      if (settings.enabled) {
        if (!settings.projectKey || !settings.projectKey.trim()) {
          setError('Укажите проект для создания задач');
          return;
        }
        if (!settings.epicKey || !settings.epicKey.trim()) {
          setError('Укажите эпик для создания задач');
          return;
        }
      }

      // Если пароль не изменен (маскирован), не отправляем его
      const settingsToSave = {
        url: settings.url.trim(),
        username: settings.username.trim(),
        enabled: settings.enabled,
        projectKey: settings.projectKey.trim(),
        epicKey: settings.epicKey.trim(),
        ...(settings.password !== '••••••••' && { password: settings.password })
      };

      const response = await api.put('/jira/settings', settingsToSave);
      
      if (response.data?.success) {
        setSuccessMessage('Настройки успешно сохранены');
        // Обновляем пароль в состоянии, чтобы показать маску
        setSettings(prev => ({ ...prev, password: '••••••••' }));
        // Загружаем проекты если интеграция включена
        if (settings.enabled && settings.url && settings.username) {
          await loadProjects();
        }
        // Очищаем сообщение через 3 секунды
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.data?.error || 'Не удалось сохранить настройки');
      }
    } catch (error: any) {
      console.error('Ошибка сохранения настроек Jira:', error);
      setError(error.response?.data?.error || 'Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setError(null);
      setSuccessMessage(null);
      setConnectionStatus(null);

      const response = await api.post('/jira/test-connection');
      const data = response.data?.success ? response.data.data : response.data;
      
      if (data?.connected) {
        setConnectionStatus({ connected: true, message: data.message || 'Подключение успешно' });
        setSuccessMessage('Подключение к Jira работает корректно');
      } else {
        setConnectionStatus({ connected: false, message: data?.message || 'Не удалось подключиться' });
        setError(data?.message || 'Не удалось подключиться к Jira');
      }
    } catch (error: any) {
      console.error('Ошибка тестирования подключения:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка тестирования подключения';
      setConnectionStatus({ connected: false, message: errorMessage });
      setError(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field: keyof JiraSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    // Очищаем сообщения при изменении
    setError(null);
    setSuccessMessage(null);
    setConnectionStatus(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Настройки интеграции с Jira</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Настройте подключение к серверу Jira для интеграции с системой оценки
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {connectionStatus && (
        <div className={`${
          connectionStatus.connected 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        } border px-4 py-3 rounded-md`}>
          <div className="flex items-center">
            {connectionStatus.connected ? (
              <>
                <svg className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700 dark:text-green-400 font-medium">Подключение установлено</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700 dark:text-red-400 font-medium">Ошибка подключения</span>
              </>
            )}
          </div>
          {connectionStatus.message && (
            <p className={`mt-2 text-sm ${
              connectionStatus.connected 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {connectionStatus.message}
            </p>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Параметры подключения</h2>
        </div>
        <div className="px-6 py-5 space-y-6">
          <div>
            <label htmlFor="jira-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Адрес Jira сервера <span className="text-red-500">*</span>
            </label>
            <input
              id="jira-url"
              type="url"
              value={settings.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="https://your-company.atlassian.net"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Укажите полный URL вашего Jira сервера (например: https://company.atlassian.net)
            </p>
          </div>

          <div>
            <label htmlFor="jira-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Имя пользователя / Email <span className="text-red-500">*</span>
            </label>
            <input
              id="jira-username"
              type="text"
              value={settings.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Email или имя пользователя для входа в Jira
            </p>
          </div>

          <div>
            <label htmlFor="jira-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Пароль / API токен <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="jira-password"
                type={showPassword ? 'text' : 'password'}
                value={settings.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder={settings.password === '••••••••' ? '••••••••' : 'Введите пароль или API токен'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L7.05 8.05M6.29 6.29L3 3m3.29 3.29l3.29 3.29m0 0L12 12.05m-2.42-2.42L6.29 6.29" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Пароль или API токен для аутентификации. Для Jira Cloud рекомендуется использовать API токен.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Интеграция с системой оценки</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Настройте автоматическое создание задач в Jira при запуске процесса оценки
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => {
                    handleInputChange('enabled', e.target.checked);
                    if (e.target.checked && settings.url && settings.username) {
                      loadProjects();
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {settings.enabled ? 'Включена' : 'Выключена'}
                </span>
              </label>
            </div>

            {settings.enabled && (
              <div className="space-y-4 mt-4">
                <div>
                  <label htmlFor="jira-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Проект <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="jira-project"
                      value={settings.projectKey}
                      onChange={(e) => {
                        handleInputChange('projectKey', e.target.value);
                        if (e.target.value) {
                          loadEpics(e.target.value);
                        } else {
                          setEpics([]);
                        }
                      }}
                      disabled={loadingProjects}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      <option value="">Выберите проект</option>
                      {projects.map((project) => (
                        <option key={project.key} value={project.key}>
                          {project.name} ({project.key})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={loadProjects}
                      disabled={loadingProjects || !settings.url || !settings.username}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingProjects ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        'Обновить'
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Проект, в котором будут создаваться задачи для оценки
                  </p>
                </div>

                <div>
                  <label htmlFor="jira-epic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Эпик <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="jira-epic"
                    value={settings.epicKey}
                    onChange={(e) => handleInputChange('epicKey', e.target.value)}
                    disabled={!settings.projectKey || epics.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <option value="">Выберите эпик</option>
                    {epics.map((epic) => (
                      <option key={epic.key} value={epic.key}>
                        {epic.name} ({epic.key})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Эпик, к которому будут относиться создаваемые задачи
                  </p>
                  {!settings.projectKey && (
                    <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                      Сначала выберите проект
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>После сохранения настроек вы сможете протестировать подключение</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving || !settings.url || !settings.username}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Тестирование...
                </span>
              ) : (
                'Тестировать подключение'
              )}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || testing}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Сохранение...
                </span>
              ) : (
                'Сохранить настройки'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Информация о настройке</h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <ul className="list-disc list-inside space-y-1">
                <li>Для Jira Cloud используйте API токен вместо пароля</li>
                <li>API токен можно создать в настройках аккаунта Atlassian</li>
                <li>Убедитесь, что URL сервера указан без завершающего слеша</li>
                <li>Настройки сохраняются в зашифрованном виде</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

