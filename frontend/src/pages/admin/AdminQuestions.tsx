import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
}

interface Question {
  id: number;
  category_id: number;
  text: string;
  description?: string;
  type: 'rating' | 'text' | 'boolean';
  min_value: number;
  max_value: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

interface QuestionFormData {
  text: string;
  description: string;
  category_id: number;
  type: 'rating' | 'text' | 'boolean';
  min_value: number;
  max_value: number;
  order_index: number;
  is_active: boolean;
}

const AdminQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const [formData, setFormData] = useState<QuestionFormData>({
    text: '',
    description: '',
    category_id: 0,
    type: 'rating',
    min_value: 1,
    max_value: 5,
    order_index: 0,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [questionsResponse, categoriesResponse] = await Promise.all([
        api.get('/questions'),
        api.get('/categories')
      ]);

      const questionsWithCategories = questionsResponse.data.map((question: Question) => ({
        ...question,
        category: categoriesResponse.data.find((cat: Category) => cat.id === question.category_id)
      }));

      setQuestions(questionsWithCategories.sort((a: Question, b: Question) => 
        a.category_id === b.category_id ? 
          a.order_index - b.order_index : 
          a.category_id - b.category_id
      ));
      setCategories(categoriesResponse.data.filter((cat: Category) => cat.is_active));
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/questions', formData);
      
      if (response.data.success) {
        setSuccessMessage('Вопрос создан');
        setShowCreateForm(false);
        resetForm();
        loadData();
      } else {
        setError(response.data.error || 'Ошибка создания вопроса');
      }
    } catch (error: any) {
      console.error('Ошибка создания вопроса:', error);
      setError(error.response?.data?.error || 'Ошибка создания вопроса');
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion) return;

    try {
      const response = await api.put(`/questions/${selectedQuestion.id}`, formData);
      
      if (response.data.success) {
        setSuccessMessage('Вопрос обновлен');
        setShowEditForm(false);
        setSelectedQuestion(null);
        resetForm();
        loadData();
      } else {
        setError(response.data.error || 'Ошибка обновления вопроса');
      }
    } catch (error: any) {
      console.error('Ошибка обновления вопроса:', error);
      setError(error.response?.data?.error || 'Ошибка обновления вопроса');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот вопрос?')) {
      return;
    }

    try {
      await api.delete(`/questions/${questionId}`);
      setSuccessMessage('Вопрос удален');
      loadData();
    } catch (error: any) {
      console.error('Ошибка удаления вопроса:', error);
      setError(error.response?.data?.error || 'Ошибка удаления вопроса');
    }
  };

  const handleToggleActive = async (questionId: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    try {
      await api.patch(`/questions/${questionId}/toggle-active`, {
        is_active: !question.is_active
      });
      setSuccessMessage(question.is_active ? 'Вопрос деактивирован' : 'Вопрос активирован');
      loadData();
    } catch (error: any) {
      console.error('Ошибка изменения статуса вопроса:', error);
      setError(error.response?.data?.error || 'Ошибка изменения статуса вопроса');
    }
  };

  const handleReorder = async (questionId: number, direction: 'up' | 'down') => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const categoryQuestions = questions.filter(q => q.category_id === question.category_id);
    const currentIndex = categoryQuestions.findIndex(q => q.id === questionId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categoryQuestions.length) return;

    try {
      const reorderedQuestions = [...categoryQuestions];
      const [moved] = reorderedQuestions.splice(currentIndex, 1);
      reorderedQuestions.splice(newIndex, 0, moved);

      // Обновляем order_index для всех затронутых вопросов
      const updates = reorderedQuestions.map((q, index) => ({
        id: q.id,
        order_index: index
      }));

      await api.patch('/questions/reorder', { questions: updates });
      setSuccessMessage('Порядок вопросов обновлен');
      loadData();
    } catch (error: any) {
      console.error('Ошибка изменения порядка вопросов:', error);
      setError(error.response?.data?.error || 'Ошибка изменения порядка вопросов');
    }
  };

  const openEditForm = (question: Question) => {
    setSelectedQuestion(question);
    setFormData({
      text: question.text,
      description: question.description || '',
      category_id: question.category_id,
      type: question.type,
      min_value: question.min_value,
      max_value: question.max_value,
      order_index: question.order_index,
      is_active: question.is_active
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      text: '',
      description: '',
      category_id: categories.length > 0 ? categories[0].id : 0,
      type: 'rating',
      min_value: 1,
      max_value: 5,
      order_index: 0,
      is_active: true
    });
  };

  const openCreateForm = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'rating': return 'Оценка';
      case 'text': return 'Текст';
      case 'boolean': return 'Да/Нет';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'rating': return 'bg-blue-100 text-blue-800';
      case 'text': return 'bg-green-100 text-green-800';
      case 'boolean': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredQuestions = selectedCategory ? 
    questions.filter(q => q.category_id === selectedCategory) : 
    questions;

  const groupedQuestions = filteredQuestions.reduce((acc, question) => {
    const categoryId = question.category_id;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(question);
    return acc;
  }, {} as Record<number, Question[]>);

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
            Управление вопросами
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Создавайте и управляйте вопросами для оценки по категориям
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={openCreateForm}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Добавить вопрос
          </button>
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

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <label htmlFor="category-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Фильтр по категории:
          </label>
          <select
            id="category-filter"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Все категории</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Список вопросов по категориям */}
      <div className="space-y-6">
        {Object.entries(groupedQuestions).map(([categoryId, categoryQuestions]) => {
          const category = categories.find(c => c.id === parseInt(categoryId));
          if (!category) return null;

          return (
            <div key={categoryId} className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <div 
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm mr-3"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {categoryQuestions.length} вопросов
                    </p>
                  </div>
                </div>
              </div>
              
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {categoryQuestions.map((question, index) => (
                  <li key={question.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {question.text}
                          </p>
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(question.type)}`}>
                            {getTypeText(question.type)}
                          </span>
                          {!question.is_active && (
                            <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              Неактивен
                            </span>
                          )}
                        </div>
                        {question.description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {question.description}
                          </p>
                        )}
                        {question.type === 'rating' && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Диапазон: {question.min_value} - {question.max_value}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Кнопки изменения порядка */}
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => handleReorder(question.id, 'up')}
                            disabled={index === 0}
                            className={`p-1 rounded text-xs ${
                              index === 0 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleReorder(question.id, 'down')}
                            disabled={index === categoryQuestions.length - 1}
                            className={`p-1 rounded text-xs ${
                              index === categoryQuestions.length - 1 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                          >
                            ↓
                          </button>
                        </div>
                        
                        <button
                          onClick={() => openEditForm(question)}
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          Редактировать
                        </button>
                        
                        <button
                          onClick={() => handleToggleActive(question.id)}
                          className={`${
                            question.is_active 
                              ? 'text-yellow-600 hover:text-yellow-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {question.is_active ? 'Деактивировать' : 'Активировать'}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Модальное окно для создания/редактирования */}
      {(showCreateForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {showCreateForm ? 'Создать вопрос' : 'Редактировать вопрос'}
            </h3>
            
            <form onSubmit={showCreateForm ? handleCreateQuestion : handleUpdateQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Текст вопроса *
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({...formData, text: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Категория *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Тип вопроса *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'rating' | 'text' | 'boolean'})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="rating">Оценка (шкала)</option>
                  <option value="text">Текстовый ответ</option>
                  <option value="boolean">Да/Нет</option>
                </select>
              </div>
              
              {formData.type === 'rating' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Минимальное значение
                    </label>
                    <input
                      type="number"
                      value={formData.min_value}
                      onChange={(e) => setFormData({...formData, min_value: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Максимальное значение
                    </label>
                    <input
                      type="number"
                      value={formData.max_value}
                      onChange={(e) => setFormData({...formData, max_value: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-center">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Активен
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowEditForm(false);
                    setSelectedQuestion(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {showCreateForm ? 'Создать' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuestions; 