import React, { useState, useEffect } from 'react';
import api from '../../services/api';

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
  prerequisites?: Course[];
  corequisites?: Course[];
}

interface CourseSelection {
  courseId: number;
  status: 'planned' | 'completed' | 'in_progress' | 'skipped';
  isRequired: boolean;
  addedAutomatically: boolean;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  position?: string;
  department?: string;
}

interface GrowthPlan {
  id: number;
  user_id: number;
  start_date: string;
  study_load_percent: number;
  end_date?: string;
  status: 'active' | 'completed';
  courses: Course[];
  test_results: TestResult[];
  // Информация о пользователе
  first_name?: string;
  last_name?: string;
  email?: string;
}

const GrowthPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<GrowthPlan[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<GrowthPlan | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Form states for create plan modal
  const [formData, setFormData] = useState({
    user_id: '',
    start_date: '',
    study_load_percent: 20,
    courses: [] as number[]
  });
  const [courseSelections, setCourseSelections] = useState<Map<number, CourseSelection>>(new Map());
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states for test result modal
  const [testFormData, setTestFormData] = useState({
    test_date: new Date().toISOString().split('T')[0],
    status: 'passed' as 'passed' | 'failed',
    notes: ''
  });
  const [testFormErrors, setTestFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansResponse, coursesResponse, usersResponse] = await Promise.all([
        api.get('/learning/growth-plans'),
        api.get('/learning/courses'),
        api.get('/learning/users')
      ]);
      
      // Обрабатываем ответы API - данные приходят напрямую в response.data
      const plansData = Array.isArray(plansResponse.data) ? plansResponse.data : [];
      const coursesData = Array.isArray(coursesResponse.data) ? coursesResponse.data : [];
      const usersData = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      
      setPlans(plansData);
      setCourses(coursesData);
      setUsers(usersData);
      
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      console.error('Детали ошибки:', (error as any).response?.data || (error as Error).message);
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

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.user_id) {
      errors.user_id = 'Выберите пользователя';
    }
    
    if (!formData.start_date) {
      errors.start_date = 'Дата начала обязательна';
    }
    
    if (formData.study_load_percent < 1 || formData.study_load_percent > 100) {
      errors.study_load_percent = 'Нагрузка должна быть от 1% до 100%';
    }
    
    if (formData.courses.length === 0) {
      errors.courses = 'Выберите хотя бы один курс';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePlan = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Преобразуем Map в объект для отправки на сервер
      const courseSelectionsObj = Object.fromEntries(courseSelections.entries());
      
      const planData = {
        ...formData,
        courseSelections: courseSelectionsObj
      };
      
      await api.post('/learning/growth-plans', planData);
      setShowCreateModal(false);
      setFormData({
        user_id: '',
        start_date: '',
        study_load_percent: 20,
        courses: []
      });
      setCourseSelections(new Map());
      setFormErrors({});
      fetchData();
    } catch (error) {
      console.error('Error creating plan:', error);
      setFormErrors({ general: 'Ошибка при создании плана. Попробуйте снова.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Функция для добавления связанных курсов
  const addRelatedCourses = (courseId: number, selections: Map<number, CourseSelection>) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return selections;

    // Добавляем prerequisites
    course.prerequisites?.forEach(prereq => {
      if (!selections.has(prereq.id)) {
        selections.set(prereq.id, {
          courseId: prereq.id,
          status: 'planned',
          isRequired: false,
          addedAutomatically: true
        });
        // Рекурсивно добавляем prerequisites для prerequisites
        addRelatedCourses(prereq.id, selections);
      }
    });

    // Добавляем corequisites
    course.corequisites?.forEach(coreq => {
      if (!selections.has(coreq.id)) {
        selections.set(coreq.id, {
          courseId: coreq.id,
          status: 'planned',
          isRequired: false,
          addedAutomatically: true
        });
        // Рекурсивно добавляем связанные курсы для corequisites
        addRelatedCourses(coreq.id, selections);
      }
    });

    return selections;
  };

  const handleCourseToggle = (courseId: number) => {
    const newSelections = new Map(courseSelections);
    
    if (newSelections.has(courseId)) {
      // Убираем курс
      newSelections.delete(courseId);
      
      // Убираем автоматически добавленные связанные курсы, если они не нужны
      const remainingCourses = Array.from(newSelections.keys());
      const toRemove: number[] = [];
      
      newSelections.forEach((selection, id) => {
        if (selection.addedAutomatically) {
          const course = courses.find(c => c.id === id);
          const isNeededAsPrereq = remainingCourses.some(remainingId => {
            const remainingCourse = courses.find(c => c.id === remainingId);
            return remainingCourse?.prerequisites?.some(p => p.id === id) || 
                   remainingCourse?.corequisites?.some(c => c.id === id);
          });
          
          if (!isNeededAsPrereq) {
            toRemove.push(id);
          }
        }
      });
      
      toRemove.forEach(id => newSelections.delete(id));
    } else {
      // Добавляем курс как обязательный
      newSelections.set(courseId, {
        courseId,
        status: 'planned',
        isRequired: true,
        addedAutomatically: false
      });
      
      // Добавляем связанные курсы
      addRelatedCourses(courseId, newSelections);
    }
    
    setCourseSelections(newSelections);
    
    // Обновляем formData для совместимости
    setFormData(prev => ({
      ...prev,
      courses: Array.from(newSelections.keys())
    }));
  };

  const updateCourseStatus = (courseId: number, status: 'planned' | 'completed' | 'in_progress' | 'skipped') => {
    const newSelections = new Map(courseSelections);
    const selection = newSelections.get(courseId);
    if (selection) {
      newSelections.set(courseId, { ...selection, status });
      setCourseSelections(newSelections);
    }
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTest(true);
    setTestFormErrors({});

    try {
      await api.post('/learning/test-results', {
        growth_plan_id: selectedPlan?.id,
        course_id: selectedCourse?.id,
        status: testFormData.status,
        test_date: testFormData.test_date,
        notes: testFormData.notes || null
      });
      
      setShowTestModal(false);
      setSelectedPlan(null);
      setSelectedCourse(null);
      setTestFormData({
        test_date: new Date().toISOString().split('T')[0],
        status: 'passed',
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error adding test result:', error);
      setTestFormErrors({
        general: 'Произошла ошибка при сохранении результата теста'
      });
    } finally {
      setIsSubmittingTest(false);
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
            Управление персональными планами развития
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
                {plan.first_name && plan.last_name && (
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    👤 {plan.last_name} {plan.first_name}
                  </p>
                )}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Создать план роста
            </h2>
            
            {formErrors.general && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {formErrors.general}
              </div>
            )}
            
            
            <form className="space-y-6">
              {/* Выбор пользователя */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Пользователь
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    formErrors.user_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">
                    {users.length === 0 ? 'Загрузка пользователей...' : 'Выберите пользователя'}
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.last_name} {user.first_name} {user.middle_name} 
                      {user.position && ` - ${user.position}`}
                      {user.department && ` (${user.department})`}
                    </option>
                  ))}
                </select>
                {formErrors.user_id && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.user_id}</p>
                )}
              </div>

              {/* Дата начала */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата начала обучения
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    formErrors.start_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.start_date && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.start_date}</p>
                )}
              </div>

              {/* Нагрузка обучения */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Нагрузка обучения (% от рабочего времени)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={formData.study_load_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, study_load_percent: parseInt(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-lg font-medium text-gray-900 dark:text-white min-w-[60px]">
                    {formData.study_load_percent}%
                  </span>
                </div>
                {formErrors.study_load_percent && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.study_load_percent}</p>
                )}
              </div>

              {/* Выбор курсов */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Выберите курсы для изучения
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                  {courses.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Загрузка курсов...
                    </div>
                  ) : (
                    courses.map((course) => {
                      const selection = courseSelections.get(course.id);
                      const isSelected = !!selection;
                      const isAutoAdded = selection?.addedAutomatically || false;
                      
                      return (
                        <div
                          key={course.id}
                          className={`flex items-start p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${
                            isAutoAdded ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`course-${course.id}`}
                            checked={isSelected}
                            onChange={() => handleCourseToggle(course.id)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <label htmlFor={`course-${course.id}`} className="font-medium text-gray-900 dark:text-white cursor-pointer">
                                    {course.name}
                                  </label>
                                  {isAutoAdded && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                      Автоматически
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {course.description}
                                </div>
                                
                                {/* Показываем prerequisites и corequisites */}
                                {(course.prerequisites?.length || course.corequisites?.length) && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    {course.prerequisites && course.prerequisites.length > 0 && (
                                      <div>
                                        <span className="font-medium">Требует:</span> {course.prerequisites.map(p => p.name).join(', ')}
                                      </div>
                                    )}
                                    {course.corequisites && course.corequisites.length > 0 && (
                                      <div>
                                        <span className="font-medium">Вместе с:</span> {course.corequisites.map(c => c.name).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Статус курса */}
                                {isSelected && (
                                  <div className="mt-2">
                                    <select
                                      value={selection?.status || 'planned'}
                                      onChange={(e) => updateCourseStatus(course.id, e.target.value as any)}
                                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                      <option value="planned">Запланирован</option>
                                      <option value="completed">Уже пройден</option>
                                      <option value="in_progress">В процессе</option>
                                      <option value="skipped">Пропустить</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {course.hours}ч
                                </div>
                                <div className="text-xs text-gray-400 flex items-center">
                                  {getLevelIcon(course.target_level)} {course.target_level}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {formErrors.courses && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.courses}</p>
                )}
                
                {/* Информация о выбранных курсах */}
                {courseSelections.size > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Выбрано курсов:</span> {courseSelections.size}
                      {Array.from(courseSelections.values()).filter(s => s.addedAutomatically).length > 0 && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {' '}(включая {Array.from(courseSelections.values()).filter(s => s.addedAutomatically).length} автоматически добавленных)
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </form>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    user_id: '',
                    start_date: '',
                    study_load_percent: 20,
                    courses: []
                  });
                  setFormErrors({});
                }}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleCreatePlan}
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Создание...
                  </>
                ) : (
                  'Создать'
                )}
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
              {selectedPlan.first_name && selectedPlan.last_name && (
                <p className="text-blue-600 dark:text-blue-400">
                  Участник: <strong>{selectedPlan.last_name} {selectedPlan.first_name}</strong>
                </p>
              )}
            </div>
            
            {testFormErrors.general && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {testFormErrors.general}
              </div>
            )}

            <form onSubmit={handleTestSubmit}>
              {/* Дата тестирования */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата тестирования
                </label>
                <input
                  type="date"
                  value={testFormData.test_date}
                  onChange={(e) => setTestFormData({...testFormData, test_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Результат теста */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Результат теста
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="passed"
                      checked={testFormData.status === 'passed'}
                      onChange={(e) => setTestFormData({...testFormData, status: e.target.value as 'passed' | 'failed'})}
                      className="mr-2 text-blue-500"
                    />
                    <span className="text-green-600 dark:text-green-400">✅ Пройден</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="failed"
                      checked={testFormData.status === 'failed'}
                      onChange={(e) => setTestFormData({...testFormData, status: e.target.value as 'passed' | 'failed'})}
                      className="mr-2 text-blue-500"
                    />
                    <span className="text-red-600 dark:text-red-400">❌ Не пройден</span>
                  </label>
                </div>
              </div>

              {/* Заметки */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Заметки (опционально)
                </label>
                <textarea
                  value={testFormData.notes}
                  onChange={(e) => setTestFormData({...testFormData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Дополнительная информация о тестировании..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTestModal(false);
                    setSelectedPlan(null);
                    setSelectedCourse(null);
                    setTestFormData({
                      test_date: new Date().toISOString().split('T')[0],
                      status: 'passed',
                      notes: ''
                    });
                    setTestFormErrors({});
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  disabled={isSubmittingTest}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  disabled={isSubmittingTest}
                >
                  {isSubmittingTest ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthPlansPage;
