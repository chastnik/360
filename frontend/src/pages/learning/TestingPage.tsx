
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
}

interface GrowthPlan {
  id: number;
  user_id: number;
  start_date: string;
  study_load_percent: number;
  status: 'active' | 'completed';
  courses: Course[];
  test_results: TestResult[];
  // Информация о пользователе
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface Filters {
  search: string;
  status: 'all' | 'passed' | 'failed';
  dateFrom: string;
  dateTo: string;
  courseId: string;
  userId: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TestingPage: React.FC = () => {
  const [plans, setPlans] = useState<GrowthPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<GrowthPlan | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Фильтры и пагинация
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    courseId: '',
    userId: ''
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  // Список курсов и пользователей для фильтров
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{id: number; first_name?: string; last_name?: string; email?: string}>>([]);
  
  // Form states for test result modal
  const [testFormData, setTestFormData] = useState({
    test_date: new Date().toISOString().split('T')[0],
    status: 'passed' as 'passed' | 'failed',
    notes: '',
    certificateFile: null as File | null,
    certificateName: ''
  });
  const [testFormErrors, setTestFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);
  
  // Состояния для модального окна загрузки сертификата к существующему тесту
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedTestResult, setSelectedTestResult] = useState<TestResult | null>(null);
  const [certificateFormData, setCertificateFormData] = useState({
    certificateFile: null as File | null,
    certificateName: ''
  });
  const [certificateFormErrors, setCertificateFormErrors] = useState<{[key: string]: string}>({});
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCoursesAndUsers();
  }, []);

  const fetchCoursesAndUsers = async () => {
    try {
      const [coursesResponse, usersResponse] = await Promise.all([
        api.get('/learning/courses').catch(() => ({ data: [] })),
        api.get('/learning/users').catch(() => ({ data: [] }))
      ]);
      
      const coursesData = Array.isArray(coursesResponse.data) ? coursesResponse.data : [];
      const usersData = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      
      setAllCourses(coursesData);
      setAllUsers(usersData);
    } catch (error) {
      console.error('Ошибка загрузки курсов и пользователей:', error);
    }
  };

  const fetchData = async () => {
    try {
      const response = await api.get('/learning/growth-plans');
      // Обрабатываем ответ API - может быть массив или объект с пагинацией
      let plansData: GrowthPlan[] = [];
      if (Array.isArray(response.data)) {
        plansData = response.data;
      } else if (response.data.plans) {
        plansData = response.data.plans;
      }
      setPlans(plansData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTest(true);
    setTestFormErrors({});

    try {
      // Создаем результат теста
      const testResultResponse = await api.post('/learning/test-results', {
        growth_plan_id: selectedPlan?.id,
        course_id: selectedCourse?.id,
        status: testFormData.status,
        test_date: testFormData.test_date,
        notes: testFormData.notes || null
      });
      
      const testResultId = testResultResponse.data.id;
      
      // Если есть сертификат, загружаем его
      if (testFormData.certificateFile && testFormData.certificateName) {
        const formData = new FormData();
        formData.append('certificate', testFormData.certificateFile);
        formData.append('test_result_id', testResultId.toString());
        formData.append('name', testFormData.certificateName);
        
        try {
          await api.post('/learning/certificates/test-result', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        } catch (certError: any) {
          console.error('Error uploading certificate:', certError);
          const errorMessage = certError.response?.data?.error || 'Не удалось загрузить сертификат';
          setTestFormErrors({
            certificate: errorMessage
          });
          // Не закрываем модальное окно, чтобы пользователь мог увидеть ошибку
          setIsSubmittingTest(false);
          return;
        }
      }
      
      setShowTestModal(false);
      setSelectedPlan(null);
      setSelectedCourse(null);
      setTestFormData({
        test_date: new Date().toISOString().split('T')[0],
        status: 'passed',
        notes: '',
        certificateFile: null,
        certificateName: ''
      });
      fetchData();
    } catch (error: any) {
      console.error('Error adding test result:', error);
      setTestFormErrors({
        general: error.response?.data?.error || 'Произошла ошибка при сохранении результата теста'
      });
    } finally {
      setIsSubmittingTest(false);
    }
  };

  const getAllTestResults = () => {
    const allResults: TestResult[] = [];
    plans.forEach(plan => {
      plan.test_results.forEach(test => {
        // Сохраняем все поля, включая certificates
        allResults.push({
          ...test,
          growth_plan_id: plan.id,
          certificates: test.certificates || []
        });
      });
    });
    return allResults;
  };

  const getFilteredTestResults = () => {
    const allResults = getAllTestResults();
    let filtered = allResults;
    
    // Фильтр по статусу
    if (filters.status !== 'all') {
      filtered = filtered.filter(test => test.status === filters.status);
    }
    
    // Фильтр по поиску (название курса, имя пользователя)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(test => {
        const courseName = test.course_name?.toLowerCase() || '';
        const plan = plans.find(p => p.id === test.growth_plan_id);
        const userName = plan ? `${plan.first_name || ''} ${plan.last_name || ''}`.toLowerCase() : '';
        const userEmail = plan?.email?.toLowerCase() || '';
        return courseName.includes(searchLower) || 
               userName.includes(searchLower) || 
               userEmail.includes(searchLower);
      });
    }
    
    // Фильтр по дате от
    if (filters.dateFrom) {
      filtered = filtered.filter(test => {
        const testDate = new Date(test.test_date);
        const filterDate = new Date(filters.dateFrom);
        return testDate >= filterDate;
      });
    }
    
    // Фильтр по дате до
    if (filters.dateTo) {
      filtered = filtered.filter(test => {
        const testDate = new Date(test.test_date);
        const filterDate = new Date(filters.dateTo);
        filterDate.setHours(23, 59, 59, 999); // Включаем весь день
        return testDate <= filterDate;
      });
    }
    
    // Фильтр по курсу
    if (filters.courseId) {
      filtered = filtered.filter(test => test.course_id === parseInt(filters.courseId));
    }
    
    // Фильтр по пользователю
    if (filters.userId) {
      filtered = filtered.filter(test => {
        const plan = plans.find(p => p.id === test.growth_plan_id);
        return plan && plan.user_id === parseInt(filters.userId);
      });
    }
    
    return filtered;
  };
  
  const getPaginatedTestResults = () => {
    const filtered = getFilteredTestResults();
    const total = filtered.length;
    const totalPages = Math.ceil(total / pagination.limit);
    
    // Обновляем пагинацию
    if (pagination.total !== total || pagination.totalPages !== totalPages) {
      setPagination(prev => ({
        ...prev,
        total,
        totalPages
      }));
    }
    
    // Применяем пагинацию
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    
    return {
      results: filtered.slice(startIndex, endIndex),
      total,
      totalPages
    };
  };
  
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Сбрасываем на первую страницу при изменении фильтров
  };
  
  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      courseId: '',
      userId: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const hasActiveFilters = filters.search !== '' || 
    filters.status !== 'all' || 
    filters.dateFrom !== '' || 
    filters.dateTo !== '' || 
    filters.courseId !== '' || 
    filters.userId !== '';
  
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Обработчик загрузки сертификата к существующему тесту
  const handleCertificateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploadingCertificate(true);
    setCertificateFormErrors({});

    if (!selectedTestResult) {
      setCertificateFormErrors({ general: 'Не выбран тест' });
      setIsUploadingCertificate(false);
      return;
    }

    if (!certificateFormData.certificateFile || !certificateFormData.certificateName) {
      setCertificateFormErrors({ general: 'Необходимо выбрать файл и указать название сертификата' });
      setIsUploadingCertificate(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('certificate', certificateFormData.certificateFile);
      formData.append('test_result_id', selectedTestResult.id.toString());
      formData.append('name', certificateFormData.certificateName);

      await api.post('/learning/certificates/test-result', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Успешно загружено
      setShowCertificateModal(false);
      setSelectedTestResult(null);
      setCertificateFormData({
        certificateFile: null,
        certificateName: ''
      });
      setCertificateFormErrors({});
      
      // Обновляем данные
      fetchData();
    } catch (error: any) {
      console.error('Error uploading certificate:', error);
      const errorMessage = error.response?.data?.error || 'Не удалось загрузить сертификат. Проверьте формат файла и попробуйте снова.';
      setCertificateFormErrors({
        general: errorMessage
      });
    } finally {
      setIsUploadingCertificate(false);
    }
  };

  // Не используется - закомментировано для будущего использования
  // const handleAddTestResult = async (formData: any) => {
  //   try {
  //     await api.post('/learning/test-results', {
  //       ...formData,
  //       growth_plan_id: selectedPlan?.id,
  //       course_id: selectedCourse?.id
  //     });
  //     setShowTestModal(false);
  //     setSelectedPlan(null);
  //     setSelectedCourse(null);
  //     fetchData();
  //   } catch (error) {
  //     console.error('Error adding test result:', error);
  //   }
  // };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const stats = getStatistics();
  const { results: paginatedResults, total: filteredTotal, totalPages } = getPaginatedTestResults();

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
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Фильтры</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <svg className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showFilters ? 'Скрыть' : 'Показать'} фильтры
          </button>
        </div>
        
        {/* Быстрые фильтры по статусу */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleFilterChange('status', 'all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filters.status === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Все ({stats.total})
          </button>
          <button
            onClick={() => handleFilterChange('status', 'passed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filters.status === 'passed'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Пройдено ({stats.passed})
          </button>
          <button
            onClick={() => handleFilterChange('status', 'failed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filters.status === 'failed'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Не пройдено ({stats.failed})
          </button>
        </div>
        
        {/* Расширенные фильтры */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Поиск */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Поиск
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Курс, имя, email..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Дата от */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата от
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Дата до */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата до
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Курс */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Курс
              </label>
              <select
                value={filters.courseId}
                onChange={(e) => handleFilterChange('courseId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Все курсы</option>
                {allCourses.map(course => (
                  <option key={course.id} value={course.id.toString()}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Пользователь */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Пользователь
              </label>
              <select
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Все пользователи</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.id.toString()}>
                    {user.last_name || ''} {user.first_name || ''} {user.email ? `(${user.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Кнопка очистки фильтров */}
            <div className="flex items-end">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Очистить фильтры
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Информация о результатах фильтрации */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Найдено результатов: <span className="font-semibold text-gray-900 dark:text-white">{filteredTotal}</span>
            </p>
          </div>
        )}
      </div>

      {/* Результаты тестирования */}
      <div className="space-y-4">
        {paginatedResults.map((test) => {
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
                  {plan && plan.first_name && plan.last_name && (
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                      👤 Тестируемый: {plan.last_name} {plan.first_name}
                    </p>
                  )}
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
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
                    📝 Заметки
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">
                    {test.notes}
                  </div>
                </div>
              )}

              {/* Сертификаты для пройденных тестов */}
              {test.status === 'passed' && (
                <div className="mb-4">
                  {(() => {
                    const certs = test.certificates || [];
                    if (certs.length > 0) {
                      return (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-2">
                          <div className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                            📜 Сертификаты
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {certs.map((cert) => (
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
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-md border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                              >
                                <span>📄</span>
                                <span className="text-sm font-medium">{cert.name}</span>
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  ({Math.round(cert.file_size / 1024)} KB)
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Кнопка для добавления сертификата */}
                  <button
                    onClick={() => {
                      setSelectedTestResult(test);
                      setCertificateFormData({
                        certificateFile: null,
                        certificateName: ''
                      });
                      setCertificateFormErrors({});
                      setShowCertificateModal(true);
                    }}
                    className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {test.certificates && test.certificates.length > 0 ? 'Добавить еще сертификат' : 'Добавить сертификат'}
                  </button>
                </div>
              )}

              {/* Кнопка "Тестировать заново" для непройденных тестов */}
              {test.status === 'failed' && plan && course && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setSelectedCourse(course);
                      setTestFormData({
                        test_date: new Date().toISOString().split('T')[0],
                        status: 'passed',
                        notes: '',
                        certificateFile: null,
                        certificateName: ''
                      });
                      setShowTestModal(true);
                    }}
                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Тестировать заново
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Показано <span className="font-semibold text-gray-900 dark:text-white">
              {(pagination.page - 1) * pagination.limit + 1}
            </span> - <span className="font-semibold text-gray-900 dark:text-white">
              {Math.min(pagination.page * pagination.limit, filteredTotal)}
            </span> из <span className="font-semibold text-gray-900 dark:text-white">{filteredTotal}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Первая
            </button>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            
            {/* Номера страниц */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pagination.page === pageNum
                        ? 'bg-blue-500 text-white'
                        : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вперед
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={pagination.page === totalPages}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Последняя
            </button>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Страница <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> из <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
          </div>
        </div>
      )}

      {/* Курсы без тестирования */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          📚 Курсы без тестирования
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => 
            plan.courses.map((course) => {
              // Курс считается завершенным, если есть хотя бы один успешный результат (passed)
              const hasPassedTest = plan.test_results.some(t => t.course_id === course.id && t.status === 'passed');
              if (hasPassedTest) return null;

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
                  
                  {plan.first_name && plan.last_name && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                      👤 {plan.last_name} {plan.first_name}
                    </p>
                  )}
                  
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

      {paginatedResults.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Результаты тестирования не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {hasActiveFilters
              ? 'Попробуйте изменить параметры фильтрации'
              : filters.status === 'all' 
                ? 'Начните проходить тесты по курсам'
                : `Нет ${filters.status === 'passed' ? 'пройденных' : 'не пройденных'} тестов`
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
            >
              Очистить фильтры
            </button>
          )}
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
              {selectedPlan.first_name && selectedPlan.last_name && (
                <p className="text-blue-600 dark:text-blue-400">
                  Участник: <strong>{selectedPlan.last_name} {selectedPlan.first_name}</strong>
                </p>
              )}
            </div>
            
            {testFormErrors.general && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
                {testFormErrors.general}
              </div>
            )}
            
            {testFormErrors.certificate && (
              <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 rounded">
                ⚠️ {testFormErrors.certificate}
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
              <div className="mb-4">
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

              {/* Сертификат (опционально) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Сертификат (опционально)
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={testFormData.certificateName}
                    onChange={(e) => setTestFormData({...testFormData, certificateName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Название сертификата"
                  />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setTestFormData({...testFormData, certificateFile: file});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Поддерживаемые форматы: PDF, JPEG, PNG, TIFF (макс. 10 МБ)
                  </p>
                </div>
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
                      notes: '',
                      certificateFile: null,
                      certificateName: ''
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

      {/* Модальное окно для загрузки сертификата к существующему тесту */}
      {showCertificateModal && selectedTestResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Добавить сертификат
            </h2>
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400">
                Курс: <strong>{selectedTestResult.course_name}</strong>
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Дата теста: <strong>{new Date(selectedTestResult.test_date).toLocaleDateString('ru-RU')}</strong>
              </p>
            </div>
            
            {certificateFormErrors.general && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
                {certificateFormErrors.general}
              </div>
            )}

            <form onSubmit={handleCertificateUpload}>
              {/* Название сертификата */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название сертификата <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={certificateFormData.certificateName}
                  onChange={(e) => setCertificateFormData({...certificateFormData, certificateName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Например: Сертификат об окончании курса"
                  required
                />
              </div>

              {/* Файл сертификата */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Файл сертификата <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCertificateFormData({...certificateFormData, certificateFile: file});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-sm"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Поддерживаемые форматы: PDF, JPEG, PNG, TIFF (макс. 10 МБ)
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCertificateModal(false);
                    setSelectedTestResult(null);
                    setCertificateFormData({
                      certificateFile: null,
                      certificateName: ''
                    });
                    setCertificateFormErrors({});
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  disabled={isUploadingCertificate}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  disabled={isUploadingCertificate}
                >
                  {isUploadingCertificate ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Загрузка...
                    </>
                  ) : (
                    'Загрузить сертификат'
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

export default TestingPage;
