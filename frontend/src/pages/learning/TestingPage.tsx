import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface TestResult {
  id: number;
  growth_plan_id: number;
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
  start_date: string;
  study_load_percent: number;
  status: 'active' | 'completed';
  courses: Course[];
  test_results: TestResult[];
}

const TestingPage: React.FC = () => {
  const [plans, setPlans] = useState<GrowthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<GrowthPlan | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/learning/growth-plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAllTestResults = () => {
    const allResults: TestResult[] = [];
    plans.forEach(plan => {
      plan.test_results.forEach(test => {
        allResults.push({
          ...test,
          growth_plan_id: plan.id
        });
      });
    });
    return allResults;
  };

  const getFilteredTestResults = () => {
    const allResults = getAllTestResults();
    if (filterStatus === 'all') return allResults;
    return allResults.filter(test => test.status === filterStatus);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'junior': return '🌱';
      case 'middle': return '🌿';
      case 'senior': return '🌳';
      default: return '❓';
    }
  };

  const getStatistics = () => {
    const allResults = getAllTestResults();
    const total = allResults.length;
    const passed = allResults.filter(t => t.status === 'passed').length;
    const failed = allResults.filter(t => t.status === 'failed').length;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { total, passed, failed, successRate };
  };

  const handleAddTestResult = async (formData: any) => {
    try {
      await api.post('/learning/test-results', {
        ...formData,
        growth_plan_id: selectedPlan?.id,
        course_id: selectedCourse?.id
      });
      setShowTestModal(false);
      setSelectedPlan(null);
      setSelectedCourse(null);
      fetchData();
    } catch (error) {
      console.error('Error adding test result:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const stats = getStatistics();
  const filteredResults = getFilteredTestResults();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          ✅ Тестирование
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Результаты тестирования по курсам обучения
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📊</div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Всего тестов</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">✅</div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.passed}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Пройдено</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">❌</div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Не пройдено</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📈</div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.successRate}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Успешность</div>
            </div>
          </div>
        </div>
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
            Все ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('passed')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filterStatus === 'passed'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Пройдено ({stats.passed})
          </button>
          <button
            onClick={() => setFilterStatus('failed')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filterStatus === 'failed'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Не пройдено ({stats.failed})
          </button>
        </div>
      </div>

      {/* Результаты тестирования */}
      <div className="space-y-4">
        {filteredResults.map((test) => {
          const plan = plans.find(p => p.id === test.growth_plan_id);
          const course = plan?.courses.find(c => c.id === test.course_id);
          
          return (
            <div
              key={test.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {test.course_name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    План #{test.growth_plan_id} • {new Date(test.test_date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(test.status)}`}>
                  {getStatusIcon(test.status)} {test.status === 'passed' ? 'Пройден' : 'Не пройден'}
                </span>
              </div>

              {course && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Уровень</div>
                    <div className="font-medium text-gray-900 dark:text-white flex items-center">
                      {getLevelIcon(course.target_level)} {course.target_level}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Объем курса</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {course.hours} часов
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Дата тестирования</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {new Date(test.test_date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
              )}

              {test.notes && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
                    📝 Заметки
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">
                    {test.notes}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Курсы без тестирования */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          📚 Курсы без тестирования
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => 
            plan.courses.map((course) => {
              const hasTest = plan.test_results.some(t => t.course_id === course.id);
              if (hasTest) return null;

              return (
                <div
                  key={`${plan.id}-${course.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-2 border-dashed border-gray-300 dark:border-gray-600"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {course.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {course.hours}ч
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      {getLevelIcon(course.target_level)} {course.target_level}
                    </span>
                    <span className="text-xs text-gray-400">Не тестирован</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setSelectedCourse(course);
                      setShowTestModal(true);
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
                  >
                    📝 Добавить результат теста
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {filteredResults.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Результаты тестирования не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filterStatus === 'all' 
              ? 'Начните проходить тесты по курсам'
              : `Нет ${filterStatus === 'passed' ? 'пройденных' : 'не пройденных'} тестов`
            }
          </p>
        </div>
      )}

      {/* Add Test Result Modal */}
      {showTestModal && selectedPlan && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Результат теста
            </h2>
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400">
                Курс: <strong>{selectedCourse.name}</strong>
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                План: <strong>#{selectedPlan.id}</strong>
              </p>
            </div>
            {/* TODO: Add form */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setSelectedPlan(null);
                  setSelectedCourse(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Отмена
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestingPage;
