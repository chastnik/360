
// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCycles: number;
  activeCycles: number;
  completedAssessments: number;
  pendingAssessments: number;
  totalQuestions: number;
  totalCategories: number;
  mattermostConnection: boolean;
  mattermostUsers: number;
}

interface RecentActivity {
  id: number;
  type: 'cycle_created' | 'cycle_started' | 'assessment_completed' | 'user_registered';
  description: string;
  user: string;
  timestamp: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Параллельно загружаем все данные
      const [
        usersResponse,
        cyclesResponse,
        assessmentsResponse,
        questionsResponse,
        categoriesResponse,
        mattermostResponse
      ] = await Promise.all([
        api.get('/users'),
        api.get('/cycles'),
        api.get('/assessments'),
        api.get('/questions'),
        api.get('/categories'),
        api.get('/mattermost/integration-stats').catch(() => ({ data: { connection: { status: 'disconnected' }, users: { withMattermost: 0 } } }))
      ]);

      // Подсчитываем статистику - обрабатываем новый формат API
      const users = usersResponse.data?.success ? usersResponse.data.data : usersResponse.data;
      const cycles = cyclesResponse.data?.success ? cyclesResponse.data.data : cyclesResponse.data;
      const assessments = assessmentsResponse.data?.success ? assessmentsResponse.data.data : assessmentsResponse.data;
      const questions = questionsResponse.data?.success ? questionsResponse.data.data : questionsResponse.data;
      const categories = categoriesResponse.data?.success ? categoriesResponse.data.data : categoriesResponse.data;
      const mattermostData = mattermostResponse.data?.success ? mattermostResponse.data.data : mattermostResponse.data;

      const dashboardStats: DashboardStats = {
        totalUsers: Array.isArray(users) ? users.length : 0,
        activeUsers: Array.isArray(users) ? users.filter((user: any) => user.is_active).length : 0,
        totalCycles: Array.isArray(cycles) ? cycles.length : 0,
        activeCycles: Array.isArray(cycles) ? cycles.filter((cycle: any) => cycle.status === 'active').length : 0,
        completedAssessments: Array.isArray(assessments) ? assessments.filter((assessment: any) => assessment.status === 'completed').length : 0,
        pendingAssessments: Array.isArray(assessments) ? assessments.filter((assessment: any) => assessment.status === 'pending' || assessment.status === 'in_progress').length : 0,
        totalQuestions: Array.isArray(questions) ? questions.length : 0,
        totalCategories: Array.isArray(categories) ? categories.length : 0,
        mattermostConnection: mattermostData.connection?.status === 'connected',
        mattermostUsers: mattermostData.users?.withMattermost || 0
      };

      setStats(dashboardStats);

      // Недавняя активность — реальные данные
      try {
        const activityRes = await api.get('/admin/recent-activity');
        const list = activityRes.data?.success ? activityRes.data.data : [];
        setRecentActivity(list);
      } catch (e) {
        console.warn('Не удалось получить недавнюю активность, оставляем пусто');
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных дашборда:', error);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cycle_created': return '🔄';
      case 'cycle_started': return '▶️';
      case 'assessment_completed': return '✅';
      case 'user_registered': return '👤';
      default: return '📝';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} мин назад`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} ч назад`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} дн назад`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Панель администратора
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Обзор системы 360° оценки персонала
          </p>
        </div>
      </div>

      {/* Основная статистика */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">👥</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Пользователи
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.activeUsers} / {stats?.totalUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to="/admin/users" className="font-medium text-primary-600 hover:text-primary-500">
                Управление пользователями
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">🔄</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Циклы оценки
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.activeCycles} / {stats?.totalCycles}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to="/admin/cycles" className="font-medium text-primary-600 hover:text-primary-500">
                Управление циклами
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📝</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Оценки
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.completedAssessments} / {(stats?.completedAssessments || 0) + (stats?.pendingAssessments || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to="/admin/reports" className="font-medium text-primary-600 hover:text-primary-500">
                Просмотреть отчеты
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">💬</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Mattermost
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats?.mattermostUsers} пользователей
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to="/admin/mattermost" className="font-medium text-primary-600 hover:text-primary-500">
                Настройка интеграции
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Быстрые действия
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/admin/users"
              className="relative rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <span className="text-xl">👥</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Добавить пользователя
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Зарегистрировать нового сотрудника
                </p>
              </div>
            </Link>

            <Link
              to="/admin/cycles"
              className="relative rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <span className="text-xl">🔄</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Создать цикл оценки
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Запустить новый цикл 360° оценки
                </p>
              </div>
            </Link>

            <Link
              to="/admin/questions"
              className="relative rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <span className="text-xl">❓</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Управление вопросами
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Добавить или изменить вопросы
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Статус системы */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Статус системы
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-3 h-3 rounded-full ${stats?.mattermostConnection ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Mattermost
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats?.mattermostConnection ? 'Подключен' : 'Отключен'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 w-3 h-3 rounded-full bg-green-500"></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  База данных
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Работает
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 w-3 h-3 rounded-full bg-green-500"></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  API
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Работает
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Недавняя активность */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Недавняя активность
          </h3>
          <div className="mt-5">
            {recentActivity.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentActivity.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== recentActivity.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="text-xl">
                              {getActivityIcon(activity.type)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {activity.description}{' '}
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {activity.user}
                                </span>
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                              {formatTimeAgo(activity.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Нет недавней активности
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 