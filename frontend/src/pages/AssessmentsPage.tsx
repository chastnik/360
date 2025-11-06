
// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
// Layout убран - компонент оборачивается в Layout на уровне роутинга
import api from '../services/api';

interface Assessment {
  id: number;
  participant_id: number;
  participant_name: string;
  cycle_name: string;
  cycle_description: string;
  end_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
}

export const AssessmentsPage: React.FC = () => {
  const location = useLocation();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAssessments();
    
    // Проверяем, есть ли сообщение об успехе в состоянии навигации
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Очищаем сообщение из истории, чтобы оно не отображалось при повторном входе
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/assessments/available');
      // Обрабатываем новый формат API
      const assessmentsData = response.data?.success ? response.data.data : response.data;
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);
    } catch (error) {
      console.error('Ошибка при загрузке опросов:', error);
      setError('Не удалось загрузить опросы');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'in_progress': return 'В процессе';
      case 'completed': return 'Завершен';
      default: return 'Неизвестно';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '🔄';
      case 'completed': return '✅';
      default: return '❓';
    }
  };

  const isExpired = (endDate: string) => {
    // Сравниваем только даты (без времени), чтобы опрос был доступен до конца дня окончания включительно
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Устанавливаем конец дня для даты окончания
    const now = new Date();
    return end < now;
  };

  const getDaysRemaining = (endDate: string) => {
    // Сравниваем только даты (без времени), чтобы опрос был доступен до конца дня окончания включительно
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Устанавливаем конец дня для даты окончания
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Устанавливаем начало дня для текущей даты
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Доступные опросы
          </h1>
          <button
            onClick={loadAssessments}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Обновить
          </button>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {assessments.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Нет доступных опросов
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              В данный момент для вас нет доступных опросов для прохождения.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map(assessment => {
              const daysRemaining = getDaysRemaining(assessment.end_date);
              const expired = isExpired(assessment.end_date);
              
              return (
                <div
                  key={assessment.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${
                    expired ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getStatusIcon(assessment.status)}</span>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          Оценка: {assessment.participant_name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                          {getStatusText(assessment.status)}
                        </span>
                      </div>
                      
                      <h4 className="text-md font-medium text-primary-600 dark:text-primary-400 mb-2">
                        {assessment.cycle_name}
                      </h4>
                      
                      {assessment.cycle_description && (
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          {assessment.cycle_description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>Окончание: {new Date(assessment.end_date).toLocaleDateString()}</span>
                        </div>
                        
                        {assessment.status === 'completed' && assessment.completed_at && (
                          <div className="flex items-center gap-1">
                            <span>✅</span>
                            <span>Завершен: {new Date(assessment.completed_at).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {!expired && assessment.status !== 'completed' && (
                          <div className={`flex items-center gap-1 ${daysRemaining <= 3 ? 'text-red-600' : 'text-green-600'}`}>
                            <span>⏰</span>
                            <span>
                              {daysRemaining > 0 
                                ? `Осталось: ${daysRemaining} дн.` 
                                : 'Истекает сегодня'
                              }
                            </span>
                          </div>
                        )}
                        
                        {expired && assessment.status !== 'completed' && (
                          <div className="flex items-center gap-1 text-red-600">
                            <span>❌</span>
                            <span>Просрочен</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {assessment.status === 'completed' ? (
                        <div className="text-green-600 font-medium">
                          Завершено
                        </div>
                      ) : expired ? (
                        <div className="text-red-600 font-medium">
                          Недоступно
                        </div>
                      ) : (
                        <Link
                          to={`/survey/${assessment.id}`}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          {assessment.status === 'pending' ? 'Начать' : 'Продолжить'}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Информационная панель */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
            Как проходить опрос?
          </h3>
          <div className="space-y-2 text-blue-800 dark:text-blue-200">
            <p>• Нажмите "Начать" или "Продолжить" рядом с опросом</p>
            <p>• Оцените каждый вопрос по шкале от 1 до 5</p>
            <p>• Вы можете сохранить прогресс и продолжить позже</p>
            <p>• После ответа на все вопросы нажмите "Завершить опрос"</p>
            <p>• Обратите внимание на сроки выполнения</p>
          </div>
        </div>
      </div>
  );
}; 