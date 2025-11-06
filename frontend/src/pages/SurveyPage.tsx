
// Автор: Стас Чашин @chastnik
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Layout убран - компонент оборачивается в Layout на уровне роутинга
import api from '../services/api';

interface Question {
  id: string; // UUID
  text: string;
  category_id: number;
  category_name: string;
  category_color: string;
  order: number;
  response: number | null;
}

interface Progress {
  totalQuestions: number;
  answeredQuestions: number;
  percentage: number;
  categories: {
    id: number;
    name: string;
    color: string;
    total_questions: number;
    answered_questions: number;
  }[];
}

interface AssessmentInfo {
  id: number;
  participant_name: string;
  cycle_name: string;
  cycle_description: string;
  end_date: string;
  status: string;
}

export const SurveyPage: React.FC = () => {
  const { respondentId, token } = useParams<{ respondentId?: string; token?: string }>();
  const navigate = useNavigate();
  
  // Используем respondentId или token (для обратной совместимости)
  const actualRespondentId = respondentId || token;
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessmentInfo, setAssessmentInfo] = useState<AssessmentInfo | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const loadSurveyData = useCallback(async () => {
    if (!actualRespondentId) {
      setError('ID респондента не указан');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`[SurveyPage] Загружаем данные для respondentId: ${actualRespondentId}`);
      
      const [questionsResponse, progressResponse] = await Promise.all([
        api.get(`/assessments/${actualRespondentId}/questions`),
        api.get(`/assessments/${actualRespondentId}/progress`)
      ]);

      // Проверяем, что данные получены корректно
      if (!questionsResponse.data || !Array.isArray(questionsResponse.data)) {
        throw new Error('Некорректный формат данных вопросов');
      }

      if (!progressResponse.data || !progressResponse.data.progress) {
        throw new Error('Некорректный формат данных прогресса');
      }

      // Проверяем, что у всех вопросов есть id
      const questionsWithIds = questionsResponse.data.map((q: any, index: number) => {
        if (!q.id) {
          console.error(`Вопрос ${index} не имеет id:`, q);
          throw new Error(`Вопрос ${index} не имеет id`);
        }
        return q;
      });

      console.log(`[SurveyPage] Загружено ${questionsWithIds.length} вопросов, первый вопрос:`, questionsWithIds[0]);

      setQuestions(questionsWithIds);
      setProgress(progressResponse.data.progress);
      setAssessmentInfo(progressResponse.data.respondent);
      
      // Установить первую категорию как текущую
      if (questionsResponse.data.length > 0) {
        setCurrentCategoryId(questionsResponse.data[0].category_id);
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке данных опроса:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Не удалось загрузить данные опроса';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [actualRespondentId]);

  useEffect(() => {
    if (actualRespondentId) {
      loadSurveyData();
    } else {
      setError('ID респондента не указан');
      setLoading(false);
    }
  }, [actualRespondentId, loadSurveyData]);

  const handleScoreChange = async (questionId: string, score: number) => {
    if (!questionId) {
      console.error('handleScoreChange: questionId не определен', { questionId, score });
      setError('ID вопроса не указан');
      return;
    }

    if (!actualRespondentId) {
      console.error('handleScoreChange: actualRespondentId не определен', { questionId, score });
      setError('ID респондента не указан');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const requestData = {
        question_id: questionId,
        score: score
      };
      
      console.log(`[SurveyPage] Сохраняем ответ:`, {
        questionId,
        score,
        respondentId: actualRespondentId,
        requestData,
        questionIdType: typeof questionId
      });
      
      await api.post(`/assessments/${actualRespondentId}/responses`, requestData);

      // Обновить локальное состояние
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId ? { ...q, response: score } : q
        )
      );

      // Обновить прогресс
      await loadProgress();
    } catch (error) {
      console.error('Ошибка при сохранении ответа:', error);
      setError('Не удалось сохранить ответ');
    } finally {
      setSaving(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await api.get(`/assessments/${actualRespondentId}/progress`);
      setProgress(response.data.progress);
    } catch (error) {
      console.error('Ошибка при загрузке прогресса:', error);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      await api.post(`/assessments/${actualRespondentId}/complete`);
      navigate('/assessments', { 
        state: { message: 'Опрос успешно завершен!' } 
      });
    } catch (error: any) {
      console.error('Ошибка при завершении опроса:', error);
      setError(error.response?.data?.error || 'Не удалось завершить опрос');
    } finally {
      setSaving(false);
      setShowConfirmDialog(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 2) return 'text-red-600';
    if (score <= 3) return 'text-yellow-600';
    if (score <= 4) return 'text-blue-600';
    return 'text-green-600';
  };

  const getScoreText = (score: number) => {
    const texts = {
      1: 'Очень плохо',
      2: 'Плохо',
      3: 'Удовлетворительно',
      4: 'Хорошо',
      5: 'Отлично'
    };
    return texts[score as keyof typeof texts];
  };

  const filteredQuestions = questions.filter(q => q.category_id === currentCategoryId);
  const categories = questions.reduce((acc, q) => {
    if (!acc.find(c => c.id === q.category_id)) {
      acc.push({
        id: q.category_id,
        name: q.category_name,
        color: q.category_color
      });
    }
    return acc;
  }, [] as { id: number; name: string; color: string }[]);

  const isCompleted = progress?.percentage === 100;

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
    <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Оценка: {assessmentInfo?.participant_name}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {assessmentInfo?.cycle_name}
          </p>
          
          {/* Прогресс */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Прогресс: {progress?.answeredQuestions} из {progress?.totalQuestions}
              </span>
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                {progress?.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress?.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Категории */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map(category => {
              const categoryProgress = progress?.categories.find(c => c.id === category.id);
              const isCompleted = categoryProgress?.total_questions === categoryProgress?.answered_questions;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setCurrentCategoryId(category.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    currentCategoryId === category.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category.name}
                  {isCompleted && (
                    <span className="ml-1 text-green-500">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Вопросы */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            {filteredQuestions.map((question, index) => (
              <div key={question.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {index + 1}. {question.text}
                  </h3>
                  {question.response && (
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(question.response)}`}>
                      {getScoreText(question.response)}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      onClick={() => handleScoreChange(question.id, score)}
                      disabled={saving}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        question.response === score
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold mb-1">{score}</div>
                        <div className="text-xs">{getScoreText(score)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка завершения */}
        {isCompleted && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Завершение...' : 'Завершить опрос'}
            </button>
          </div>
        )}

        {/* Диалог подтверждения */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Завершить опрос?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                После завершения опроса вы не сможете изменить свои ответы.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                >
                  Отмена
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Завершение...' : 'Завершить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}; 