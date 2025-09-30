
// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import api, { categoriesAPI, questionsAPI } from '../../services/api';
import { Category } from '../../types/common';

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    icon: '',
    color: '#3B82F6',
    sort_order: 0,
    is_active: true
  });

  const availableColors = [
    { name: 'Синий', value: '#3B82F6' },
    { name: 'Зелёный', value: '#10B981' },
    { name: 'Красный', value: '#EF4444' },
    { name: 'Жёлтый', value: '#F59E0B' },
    { name: 'Фиолетовый', value: '#8B5CF6' },
    { name: 'Розовый', value: '#EC4899' },
    { name: 'Индиго', value: '#6366F1' },
    { name: 'Бирюзовый', value: '#06B6D4' },
    { name: 'Оранжевый', value: '#F97316' },
    { name: 'Серый', value: '#6B7280' }
  ];

  const popularIcons = [
    '👥', '💼', '🎯', '💡', '🔧', '📊', '🌟', '🤝', '🎨', '⚡',
    '🎪', '📈', '🔍', '💪', '🏆', '🎭', '🎬', '🎨', '🎪', '🎯'
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getCategories();
      
      if (!response.success) {
        throw new Error(response.error || 'Ошибка загрузки категорий');
      }
      
      // Получим количество вопросов для каждой категории
      const categoriesWithCounts = await Promise.all(
        (response.data || []).map(async (category: Category) => {
          try {
            const questionsResponse = await questionsAPI.getQuestions(category.id);
            return {
              ...category,
              question_count: questionsResponse.success ? (questionsResponse.data?.length || 0) : 0
            };
          } catch {
            return {
              ...category,
              question_count: 0
            };
          }
        })
      );
      
      setCategories(categoriesWithCounts.sort((a, b) => a.sort_order - b.sort_order));
    } catch (error: any) {
      console.error('Ошибка загрузки категорий:', error);
      setError(error.message || 'Не удалось загрузить категории');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/categories', formData);
      
      if (response.data.success) {
        setSuccessMessage('Категория создана');
        setShowCreateForm(false);
        resetForm();
        loadCategories();
      } else {
        setError(response.data.error || 'Ошибка создания категории');
      }
    } catch (error: any) {
      console.error('Ошибка создания категории:', error);
      setError(error.response?.data?.error || 'Ошибка создания категории');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    try {
      const response = await api.put(`/categories/${selectedCategory.id}`, formData);
      
      if (response.data.success) {
        setSuccessMessage('Категория обновлена');
        setShowEditForm(false);
        setSelectedCategory(null);
        resetForm();
        loadCategories();
      } else {
        setError(response.data.error || 'Ошибка обновления категории');
      }
    } catch (error: any) {
      console.error('Ошибка обновления категории:', error);
      setError(error.response?.data?.error || 'Ошибка обновления категории');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    if (category.question_count && category.question_count > 0) {
      setError('Нельзя удалить категорию, в которой есть вопросы');
      return;
    }

    if (!window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      return;
    }

    try {
      await api.delete(`/categories/${categoryId}`);
      setSuccessMessage('Категория удалена');
      loadCategories();
    } catch (error: any) {
      console.error('Ошибка удаления категории:', error);
      setError(error.response?.data?.error || 'Ошибка удаления категории');
    }
  };

  const handleToggleActive = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    try {
      await api.patch(`/categories/${categoryId}/toggle-active`, {
        is_active: !category.is_active
      });
      setSuccessMessage(category.is_active ? 'Категория деактивирована' : 'Категория активирована');
      loadCategories();
    } catch (error: any) {
      console.error('Ошибка изменения статуса категории:', error);
      setError(error.response?.data?.error || 'Ошибка изменения статуса категории');
    }
  };

  const handleReorder = async (categoryId: string, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    try {
      const reorderedCategories = [...categories];
      const [moved] = reorderedCategories.splice(currentIndex, 1);
      reorderedCategories.splice(newIndex, 0, moved);

      // Обновляем sort_order для всех затронутых категорий
      const updates = reorderedCategories.map((category, index) => ({
        id: category.id,
        sort_order: index
      }));

      await api.patch('/categories/reorder', { categories: updates });
      setSuccessMessage('Порядок категорий обновлен');
      loadCategories();
    } catch (error: any) {
      console.error('Ошибка изменения порядка категорий:', error);
      setError(error.response?.data?.error || 'Ошибка изменения порядка категорий');
    }
  };

  const openEditForm = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      sort_order: category.sort_order,
      is_active: category.is_active
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '',
      color: '#3B82F6',
      sort_order: categories.length,
      is_active: true
    });
  };

  const openCreateForm = () => {
    resetForm();
    setShowCreateForm(true);
  };

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
            Управление категориями
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Создавайте и управляйте категориями вопросов для оценки
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={openCreateForm}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Добавить категорию
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

      {/* Список категорий */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {categories.map((category, index) => (
            <li key={category.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-4">
                      <div 
                        className="h-12 w-12 rounded-lg flex items-center justify-center text-white text-xl"
                        style={{ backgroundColor: category.color }}
                      >
                        {category.icon}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </p>
                        {!category.is_active && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Неактивна
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {category.description}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Вопросов: {category.question_count || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Кнопки изменения порядка */}
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleReorder(category.id, 'up')}
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
                        onClick={() => handleReorder(category.id, 'down')}
                        disabled={index === categories.length - 1}
                        className={`p-1 rounded text-xs ${
                          index === categories.length - 1 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                      >
                        ↓
                      </button>
                    </div>
                    
                    <button
                      onClick={() => openEditForm(category)}
                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Редактировать
                    </button>
                    
                    <button
                      onClick={() => handleToggleActive(category.id)}
                      className={`${
                        category.is_active 
                          ? 'text-yellow-600 hover:text-yellow-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {category.is_active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    
                    {(!category.question_count || category.question_count === 0) && (
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Модальное окно для создания/редактирования */}
      {(showCreateForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {showCreateForm ? 'Создать категорию' : 'Редактировать категорию'}
            </h3>
            
            <form onSubmit={showCreateForm ? handleCreateCategory : handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Иконка
                </label>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Введите эмодзи"
                  />
                  <div className="text-2xl">{formData.icon}</div>
                </div>
                <div className="grid grid-cols-10 gap-2">
                  {popularIcons.map((icon, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFormData({...formData, icon})}
                      className="text-xl p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Цвет
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({...formData, color: color.value})}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color.value 
                          ? 'border-gray-400 ring-2 ring-gray-200' 
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Активна
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowEditForm(false);
                    setSelectedCategory(null);
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

export default AdminCategories; 