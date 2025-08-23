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
  description: string;
}

interface GrowthPlan {
  id: number;
  start_date: string;
  study_load_percent: number;
  end_date?: string;
  status: 'active' | 'completed';
  courses: Course[];
  test_results: TestResult[];
}

const GrowthPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<GrowthPlan[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<GrowthPlan | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansResponse, coursesResponse] = await Promise.all([
        api.get('/learning/growth-plans'),
        api.get('/learning/courses')
      ]);
      setPlans(plansResponse.data);
      setCourses(coursesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'junior': return '🌱';
      case 'middle': return '🌿';
      case 'senior': return '🌳';
      default: return '❓';
    }
  };

  const handleCreatePlan = async (formData: any) => {
    try {
      await api.post('/learning/growth-plans', formData);
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating plan:', error);
    }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📈 Планы индивидуального роста
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Управление вашими персональными планами развития
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <span className="mr-2">➕</span>
          Создать план
        </button>
      </div>

      <div className="grid gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  План развития #{plan.id}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Создан {new Date(plan.start_date).toLocaleDateString('ru-RU')}
                </p>
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
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Прогресс обучения
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {plan.test_results.filter(t => t.status === 'passed').length} / {plan.courses.length} курсов
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getProgressColor(getProgressPercentage(plan))}`}
                  style={{ width: `${getProgressPercentage(plan)}%` }}
                ></div>
              </div>
            </div>

            {/* Курсы */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                📚 Курсы в плане ({plan.courses.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plan.courses.map((course) => {
                  const testResult = plan.test_results.find(t => t.course_id === course.id);
                  return (
                    <div
                      key={course.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {course.name}
                        </h5>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {course.hours}ч
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {course.description}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          {getLevelIcon(course.target_level)} {course.target_level}
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

                      {!testResult && (
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
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Результаты тестирования */}
            {plan.test_results.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  ✅ Результаты тестирования
                </h4>
                <div className="space-y-3">
                  {plan.test_results.map((test) => (
                    <div
                      key={test.id}
                      className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {test.course_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(test.test_date).toLocaleDateString('ru-RU')}
                        </div>
                        {test.notes && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {test.notes}
                          </div>
                        )}
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

      {plans.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Планы роста не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Создайте свой первый план индивидуального роста
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Создать план
          </button>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Создать план роста
            </h2>
            {/* TODO: Add form */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Отмена
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                Создать
              </button>
            </div>
          </div>
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

export default GrowthPlansPage;
