// Автор: Стас Чашин @chastnik
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface TestResult {
  id: number;
  course_id: number;
  course_name: string;
  status: 'passed' | 'failed';
  test_date: string;
  notes?: string;
  certificates?: Array<{
    id: number;
    name: string;
    file_name: string;
    file_size: number;
    file_mime: string;
    created_at: string;
  }>;
}

interface Course {
  id: number;
  name: string;
  hours: number;
  target_level: string;
  description: string;
  prerequisites?: Course[];
  corequisites?: Course[];
  competency?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface GrowthPlan {
  id: number;
  user_id: string; // UUID из базы данных
  start_date: string;
  study_load_percent: number;
  end_date?: string;
  status: 'active' | 'completed';
  courses: Course[];
  test_results: TestResult[];
  created_at?: string;
}

interface Filters {
  status: 'all' | 'active' | 'completed';
  progress: 'all' | 'completed' | 'in_progress' | 'not_started';
  dateFrom: string;
  dateTo: string;
  search: string;
}

const MyGrowthPlansPage: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<GrowthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    progress: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [loadingCourseDetails, setLoadingCourseDetails] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.get('/learning/growth-plans');
      // Обрабатываем ответ API - может быть массив или объект с пагинацией
      let plansData: GrowthPlan[] = [];
      if (Array.isArray(response.data)) {
        plansData = response.data;
      } else if (response.data.plans) {
        plansData = response.data.plans;
      }
      
      // Фильтруем только ПИРы текущего пользователя
      // Это важно, так как админы и HR могут видеть все ПИРы через API
      const userPlans = plansData.filter((plan: GrowthPlan) => {
        // Сравниваем user_id из плана с id текущего пользователя
        // user_id может быть строкой (UUID) или числом, поэтому используем == для сравнения
        return String(plan.user_id) === String(user.id);
      });
      
      setPlans(userPlans);
    } catch (error) {
      console.error('Ошибка загрузки ПИРов:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активен';
      case 'completed': return 'Завершен';
      default: return 'Неизвестно';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const togglePlanExpansion = (planId: number) => {
    setExpandedPlanId(expandedPlanId === planId ? null : planId);
  };

  const openCourseDetails = async (course: Course) => {
    try {
      setLoadingCourseDetails(true);
      setSelectedCourse(course);
      setShowCourseModal(true);
      
      // Загружаем полную информацию о курсе
      const response = await api.get(`/learning/courses/${course.id}`);
      setSelectedCourse(response.data);
    } catch (error) {
      console.error('Ошибка загрузки деталей курса:', error);
      // Используем базовую информацию о курсе, если не удалось загрузить детали
    } finally {
      setLoadingCourseDetails(false);
    }
  };

  const closeCourseModal = () => {
    setShowCourseModal(false);
    setSelectedCourse(null);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      progress: 'all',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
  };

  const filteredPlans = plans.filter(plan => {
    // Фильтр по статусу
    if (filters.status !== 'all' && plan.status !== filters.status) {
      return false;
    }

    // Фильтр по прогрессу
    const progress = getProgressPercentage(plan);
    if (filters.progress !== 'all') {
      if (filters.progress === 'completed' && progress !== 100) return false;
      if (filters.progress === 'in_progress' && (progress === 0 || progress === 100)) return false;
      if (filters.progress === 'not_started' && progress !== 0) return false;
    }

    // Фильтр по дате начала
    if (filters.dateFrom) {
      const planStartDate = new Date(plan.start_date);
      const filterFromDate = new Date(filters.dateFrom);
      if (planStartDate < filterFromDate) return false;
    }

    if (filters.dateTo) {
      const planStartDate = new Date(plan.start_date);
      const filterToDate = new Date(filters.dateTo);
      filterToDate.setHours(23, 59, 59, 999); // Включаем весь день
      if (planStartDate > filterToDate) return false;
    }

    // Поиск по названию курса
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const hasMatchingCourse = plan.courses.some(course => 
        course.name.toLowerCase().includes(searchLower) ||
        course.description.toLowerCase().includes(searchLower)
      );
      if (!hasMatchingCourse) return false;
    }

    return true;
  });

  const hasActiveFilters = filters.status !== 'all' || 
                           filters.progress !== 'all' || 
                           filters.dateFrom !== '' || 
                           filters.dateTo !== '' || 
                           filters.search !== '';

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
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              📈 Мой ПИР
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Планы индивидуального роста, созданные для вас
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Фильтры
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                {[filters.status !== 'all', filters.progress !== 'all', filters.dateFrom !== '', filters.dateTo !== '', filters.search !== ''].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Панель фильтров */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Поиск */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Поиск по курсам
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Название или описание курса..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Фильтр по статусу */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">Все</option>
                  <option value="active">Активен</option>
                  <option value="completed">Завершен</option>
                </select>
              </div>

              {/* Фильтр по прогрессу */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Прогресс
                </label>
                <select
                  value={filters.progress}
                  onChange={(e) => handleFilterChange('progress', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">Все</option>
                  <option value="completed">Завершенные (100%)</option>
                  <option value="in_progress">В процессе</option>
                  <option value="not_started">Не начатые</option>
                </select>
              </div>

              {/* Кнопка сброса */}
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Сбросить
                </button>
              </div>
            </div>

            {/* Фильтры по дате */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата начала (от)
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата начала (до)
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            ПИРы не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Для вас пока не созданы планы индивидуального роста
          </p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            ПИРы не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            По выбранным фильтрам ничего не найдено
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {hasActiveFilters && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800 dark:text-blue-300">
                  Найдено ПИРов: <strong>{filteredPlans.length}</strong> из {plans.length}
                </span>
                <button
                  onClick={resetFilters}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          )}
          {filteredPlans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const progress = getProgressPercentage(plan);
            
            return (
              <div
                key={plan.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
              >
                {/* Заголовок карточки */}
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => togglePlanExpansion(plan.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          ПИР #{plan.id}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.status)}`}>
                          {getStatusIcon(plan.status)} {getStatusText(plan.status)}
                        </span>
                        {plan.end_date && (() => {
                          const endDate = new Date(plan.end_date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          endDate.setHours(0, 0, 0, 0);
                          const isOverdue = endDate < today && plan.status === 'active';
                          return isOverdue ? (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-1">
                              <span>⚠️</span>
                              <span>Просрочено!</span>
                            </span>
                          ) : null;
                        })()}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Дата начала</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatDate(plan.start_date)}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Дата завершения</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {plan.end_date 
                              ? formatDate(plan.end_date)
                              : 'Не рассчитана'
                            }
                          </div>
                          {plan.end_date && (() => {
                            const endDate = new Date(plan.end_date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            endDate.setHours(0, 0, 0, 0);
                            const isOverdue = endDate < today && plan.status === 'active';
                            return isOverdue ? (
                              <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                                <span>⚠️</span>
                                <span>Просрочено!</span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Нагрузка</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {plan.study_load_percent}% времени
                          </div>
                        </div>
                      </div>

                      {/* Прогресс */}
                      <div className="mt-4">
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
                            className={`h-3 rounded-full transition-all ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="text-right mt-1">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex items-center">
                      <svg
                        className={`w-6 h-6 text-gray-500 dark:text-gray-400 transition-transform ${
                          isExpanded ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Раскрывающийся контент с курсами */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      📚 Курсы в плане ({plan.courses.length})
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {plan.courses.map((course) => {
                        const testResult = plan.test_results.find(t => t.course_id === course.id);
                        return (
                          <div
                            key={course.id}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h5 className="font-medium text-gray-900 dark:text-white flex-1">
                                {course.name}
                              </h5>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
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

                            {testResult && testResult.test_date && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                Дата теста: {formatDate(testResult.test_date)}
                              </div>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCourseDetails(course);
                              }}
                              className="w-full mt-3 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Подробнее
                            </button>
                          </div>
                        );
                      })}
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
                              className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {test.course_name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(test.test_date)}
                                </div>
                                {test.notes && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {test.notes}
                                  </div>
                                )}
                                {test.certificates && test.certificates.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {test.certificates.map((cert: any) => (
                                      <button
                                        key={cert.id}
                                        onClick={async () => {
                                          try {
                                            const response = await api.get(`/learning/certificates/${cert.id}/file`, {
                                              responseType: 'blob'
                                            });
                                            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = cert.file_name || cert.name;
                                            link.target = '_blank';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          } catch (error) {
                                            console.error('Ошибка загрузки сертификата:', error);
                                            alert('Не удалось загрузить сертификат. Проверьте подключение к серверу.');
                                          }
                                        }}
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer bg-transparent border-none p-0"
                                      >
                                        📜 {cert.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ml-4 ${
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно с подробной информацией о курсе */}
      {showCourseModal && selectedCourse && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeCourseModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingCourseDetails ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    📚 {selectedCourse.name}
                  </h2>
                  <button
                    onClick={closeCourseModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Основная информация */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Длительность</div>
                      <div className="font-medium text-gray-900 dark:text-white text-lg">
                        {selectedCourse.hours} часов
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Уровень</div>
                      <div className="font-medium text-gray-900 dark:text-white text-lg flex items-center gap-2">
                        {getLevelIcon(selectedCourse.target_level)} {selectedCourse.target_level}
                      </div>
                    </div>
                    {selectedCourse.competency && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Компетенция</div>
                        <div className="font-medium text-gray-900 dark:text-white text-lg">
                          {selectedCourse.competency.name}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Описание */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">📝 Описание</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedCourse.description}
                    </p>
                  </div>

                  {/* Компетенция */}
                  {selectedCourse.competency && selectedCourse.competency.description && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">🎯 Компетенция</h3>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                          {selectedCourse.competency.name}
                        </div>
                        {selectedCourse.competency.description && (
                          <p className="text-sm text-blue-800 dark:text-blue-400">
                            {selectedCourse.competency.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prerequisites */}
                  {selectedCourse.prerequisites && selectedCourse.prerequisites.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">📋 Требования</h3>
                      <div className="space-y-2">
                        {selectedCourse.prerequisites.map((prereq) => (
                          <div key={prereq.id} className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                              {prereq.name}
                            </div>
                            {prereq.description && (
                              <p className="text-sm text-blue-800 dark:text-blue-400">
                                {prereq.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                              <span>{getLevelIcon(prereq.target_level)} {prereq.target_level}</span>
                              <span>•</span>
                              <span>{prereq.hours}ч</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Corequisites */}
                  {selectedCourse.corequisites && selectedCourse.corequisites.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">🔗 Параллельные курсы</h3>
                      <div className="space-y-2">
                        {selectedCourse.corequisites.map((coreq) => (
                          <div key={coreq.id} className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="font-medium text-purple-900 dark:text-purple-300 mb-1">
                              {coreq.name}
                            </div>
                            {coreq.description && (
                              <p className="text-sm text-purple-800 dark:text-purple-400">
                                {coreq.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-xs text-purple-700 dark:text-purple-400">
                              <span>{getLevelIcon(coreq.target_level)} {coreq.target_level}</span>
                              <span>•</span>
                              <span>{coreq.hours}ч</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex justify-end">
                  <button
                    onClick={closeCourseModal}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyGrowthPlansPage;

