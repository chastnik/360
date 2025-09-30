
// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface MattermostStats {
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastSync: string | null;
  users: {
    total: number;
    withMattermost: number;
    syncPercentage: number;
  };
}

export const AdminMattermost: React.FC = () => {
  const [stats, setStats] = useState<MattermostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  const [sendingNotification, setSendingNotification] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsResponse, cyclesResponse] = await Promise.all([
        api.get('/mattermost/integration-stats'),
        api.get('/cycles').catch(() => ({ data: [] }))
      ]);

      // Преобразуем данные из API в ожидаемый формат
      const apiData = statsResponse.data?.success ? statsResponse.data.data : statsResponse.data;
      
      const transformedStats: MattermostStats = {
        connectionStatus: apiData.connection?.status === 'connected' ? 'connected' : 'disconnected',
        lastSync: null, // API не возвращает эту информацию пока
        users: apiData.users || { total: 0, withMattermost: 0, syncPercentage: 0 }
      };

      setStats(transformedStats);
      
      // Обрабатываем циклы
      const cyclesData = cyclesResponse.data?.success ? cyclesResponse.data.data : cyclesResponse.data;
      setCycles(Array.isArray(cyclesData) ? cyclesData.filter((cycle: any) => cycle.status === 'active') : []);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setError('Не удалось загрузить данные интеграции');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const response = await api.get('/mattermost/test-connection');
      
      const responseData = response.data?.success ? response.data.data : response.data;
      
      if (responseData.connected) {
        setSuccessMessage('Подключение к Mattermost работает корректно');
      } else {
        setError('Не удалось подключиться к Mattermost');
      }
      
      loadData(); // Обновляем статистику
    } catch (error: any) {
      console.error('Ошибка тестирования подключения:', error);
      setError(error.response?.data?.error || 'Ошибка тестирования подключения');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncUsers = async (syncType: 'all' | 'team' = 'all') => {
    try {
      setSyncing(true);
      const endpoint = syncType === 'all' ? '/mattermost/sync-users' : '/mattermost/sync-team-users';
      const response = await api.post(endpoint);
      
      if (response.data.success) {
        setSuccessMessage(response.data.message);
        loadData(); // Обновляем статистику
      } else {
        setError(response.data.error || 'Ошибка синхронизации пользователей');
      }
    } catch (error: any) {
      console.error('Ошибка синхронизации пользователей:', error);
      setError(error.response?.data?.error || 'Ошибка синхронизации пользователей');
    } finally {
      setSyncing(false);
    }
  };

  const handleSendCycleNotification = async (cycleId: number) => {
    try {
      setSendingNotification(true);
      const response = await api.post(`/mattermost/notify-cycle-start/${cycleId}`);
      
      if (response.data.success) {
        setSuccessMessage(response.data.message);
      } else {
        setError(response.data.error || 'Ошибка отправки уведомлений');
      }
    } catch (error: any) {
      console.error('Ошибка отправки уведомлений:', error);
      setError(error.response?.data?.error || 'Ошибка отправки уведомлений');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleSendRespondentNotifications = async (cycleId: number) => {
    try {
      setSendingNotification(true);
      const response = await api.post(`/mattermost/notify-respondents/${cycleId}`);
      
      if (response.data.success) {
        setSuccessMessage(response.data.message);
      } else {
        setError(response.data.error || 'Ошибка отправки уведомлений');
      }
    } catch (error: any) {
      console.error('Ошибка отправки уведомлений:', error);
      setError(error.response?.data?.error || 'Ошибка отправки уведомлений');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleSendReminders = async (cycleId: number) => {
    try {
      setSendingNotification(true);
      const response = await api.post(`/mattermost/send-reminders/${cycleId}`);
      
      if (response.data.success) {
        setSuccessMessage(response.data.message);
      } else {
        setError(response.data.error || 'Ошибка отправки напоминаний');
      }
    } catch (error: any) {
      console.error('Ошибка отправки напоминаний:', error);
      setError(error.response?.data?.error || 'Ошибка отправки напоминаний');
    } finally {
      setSendingNotification(false);
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
            Интеграция с Mattermost
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Управление интеграцией и уведомлениями через Mattermost
          </p>
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

      {/* Статус подключения */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Статус подключения
          </h3>
          <div className="mt-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
                stats?.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats?.connectionStatus === 'connected' ? 'Подключено' : 'Отключено'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats?.connectionStatus === 'connected' ? 'Последняя синхронизация: ' + (stats?.lastSync || 'никогда') : ''}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Тестирование...' : 'Тестировать подключение'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика пользователей */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Синхронизация пользователей
          </h3>
          <div className="mt-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Всего пользователей
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.users.total || 0}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  С Mattermost
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.users.withMattermost || 0}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Процент синхронизации
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.users.syncPercentage || 0}%
                </dd>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => handleSyncUsers('all')}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed mr-3"
              >
                {syncing ? 'Синхронизация...' : 'Синхронизировать всех пользователей'}
              </button>
              <button
                onClick={() => handleSyncUsers('team')}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? 'Синхронизация...' : 'Только члены команды'}
              </button>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Все пользователи:</strong> Синхронизирует всех активных пользователей Mattermost (рекомендуется)</p>
                <p><strong>Только члены команды:</strong> Синхронизирует только пользователей, состоящих в указанной команде</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Уведомления */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Отправка уведомлений
          </h3>
          <div className="mt-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Выберите цикл оценки
                </label>
                <select
                  value={selectedCycle || ''}
                  onChange={(e) => setSelectedCycle(e.target.value ? parseInt(e.target.value) : null)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Выберите цикл...</option>
                  {cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.title || cycle.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedCycle && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleSendCycleNotification(selectedCycle)}
                    disabled={sendingNotification}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingNotification ? 'Отправка...' : 'Уведомить о запуске цикла'}
                  </button>
                  
                  <button
                    onClick={() => handleSendRespondentNotifications(selectedCycle)}
                    disabled={sendingNotification}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingNotification ? 'Отправка...' : 'Уведомить респондентов'}
                  </button>
                  
                  <button
                    onClick={() => handleSendReminders(selectedCycle)}
                    disabled={sendingNotification}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingNotification ? 'Отправка...' : 'Отправить напоминания'}
                  </button>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p><strong>Уведомить о запуске цикла:</strong> Отправляет уведомления всем участникам цикла о начале оценки</p>
                  <p><strong>Уведомить респондентов:</strong> Персональные уведомления респондентам о необходимости пройти оценку</p>
                  <p><strong>Отправить напоминания:</strong> Напоминания респондентам с незавершенными оценками</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Настройки интеграции */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Настройки интеграции
          </h3>
          <div className="mt-5">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Переменные окружения
                </h4>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>Для настройки интеграции необходимо указать следующие переменные:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">MATTERMOST_URL</code> - URL вашего Mattermost сервера</li>
                    <li><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">MATTERMOST_TOKEN</code> - Personal Access Token</li>
                    <li><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">MATTERMOST_TEAM_ID</code> - ID команды</li>
                    <li><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">MATTERMOST_BOT_USERNAME</code> - Имя бота (опционально)</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Автоматические уведомления
                </h4>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>Система автоматически отправляет уведомления в следующих случаях:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>При запуске цикла оценки - участникам и респондентам</li>
                    <li>При завершении всех оценок - участнику цикла</li>
                    <li>Напоминания о незавершенных оценках (можно настроить)</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Синхронизация пользователей
                </h4>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>Для корректной работы уведомлений необходимо:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Синхронизировать пользователей с Mattermost</li>
                    <li>Указать username пользователей в Mattermost</li>
                    <li>Убедиться, что пользователи находятся в одной команде</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMattermost; 