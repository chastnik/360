import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface TestResult {
  id: number;
  course_id: number;
  course_name: string;
  status: 'passed' | 'failed';
  test_date: string;
  notes?: string;
}

interface Course {
  id: number;
  name: string;
  hours: number;
  target_level: string;
}

interface GrowthPlan {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  start_date: string;
  study_load_percent: number;
  end_date?: string;
  status: 'active' | 'completed';
  courses: Course[];
  test_results: TestResult[];
}

const SchedulePage: React.FC = () => {
  const [schedule, setSchedule] = useState<GrowthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await api.get('/learning/training-schedule');
      setSchedule(response.data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🔄';
      case 'completed': return '✅';
      default: return '❓';
    }
  };

  const getProgressPercentage = (plan: GrowthPlan) => {
    if (plan.courses.length === 0) return 0;
    
    const passedTests = plan.test_results.filter(test => test.status === 'passed').length;
    return Math.round((passedTests / plan.courses.length) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredSchedule = schedule.filter(plan => {
    if (filterStatus === 'all') return true;
    return plan.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📅 График обучения
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Обзор всех планов обучения сотрудников
        </p>
      </div>

      {/* Фильтры */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filterStatus === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Все ({schedule.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filterStatus === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Активные ({schedule.filter(p => p.status === 'active').length})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filterStatus === 'completed'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Завершенные ({schedule.filter(p => p.status === 'completed').length})
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredSchedule.map((plan) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {plan.first_name} {plan.last_name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{plan.email}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.status)}`}>
                  {getStatusIcon(plan.status)} {plan.status === 'active' ? 'Активен' : 'Завершен'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  📊 {getProgressPercentage(plan)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Дата начала</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(plan.start_date).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Нагрузка</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {plan.study_load_percent}% времени
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Дата завершения</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {plan.end_date 
                    ? new Date(plan.end_date).toLocaleDateString('ru-RU')
                    : 'Не рассчитана'
                  }
                </div>
              </div>
            </div>

            {/* Прогресс */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Прогресс обучения
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {plan.test_results.filter(t => t.status === 'passed').length} / {plan.courses.length} курсов
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(getProgressPercentage(plan))}`}
                  style={{ width: `${getProgressPercentage(plan)}%` }}
                ></div>
              </div>
            </div>

            {/* Курсы */}
            <div className="mb-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                📚 Курсы в плане ({plan.courses.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {plan.courses.map((course) => {
                  const testResult = plan.test_results.find(t => t.course_id === course.id);
                  return (
                    <div
                      key={course.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                          {course.name}
                        </h5>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {course.hours}ч
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {course.target_level}
                        </span>
                        {testResult ? (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            testResult.status === 'passed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {testResult.status === 'passed' ? '✅ Пройден' : '❌ Не пройден'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Не тестирован</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Результаты тестирования */}
            {plan.test_results.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  ✅ Результаты тестирования
                </h4>
                <div className="space-y-2">
                  {plan.test_results.map((test) => (
                    <div
                      key={test.id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {test.course_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(test.test_date).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        test.status === 'passed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {test.status === 'passed' ? '✅ Пройден' : '❌ Не пройден'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSchedule.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Планы обучения не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filterStatus === 'all' 
              ? 'Создайте первый план обучения для сотрудника'
              : `Нет ${filterStatus === 'active' ? 'активных' : 'завершенных'} планов обучения`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
