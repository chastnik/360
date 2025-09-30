// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Department, User } from '../../types/common';

interface DepartmentFormData {
  name: string;
  description: string;
  code: string;
  head_id: string;
}

const AdminDepartments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    description: '',
    code: '',
    head_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [departmentsResponse, usersResponse] = await Promise.all([
        api.get('/departments'),
        api.get('/users')
      ]);
      
      // Проверяем формат ответа API
      const departmentsData = departmentsResponse.data?.success ? departmentsResponse.data.data : departmentsResponse.data;
      const usersData = usersResponse.data?.success ? usersResponse.data.data : usersResponse.data;
      
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('Ошибка загрузки данных:', error);
      setError(error.response?.data?.error || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      code: '',
      head_id: ''
    });
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const departmentData = {
        ...formData,
        head_id: formData.head_id || undefined
      };

      const response = await api.post('/departments', departmentData);
      
      if (response.data.success) {
        setSuccessMessage('Отдел создан успешно');
        setShowCreateForm(false);
        resetForm();
        loadData();
      } else {
        setError(response.data.error || 'Ошибка создания отдела');
      }
    } catch (error: any) {
      console.error('Ошибка создания отдела:', error);
      setError(error.response?.data?.error || 'Ошибка создания отдела');
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) return;

    try {
      const departmentData = {
        ...formData,
        head_id: formData.head_id || undefined
      };

      const response = await api.put(`/departments/${selectedDepartment.id}`, departmentData);
      
      if (response.data.success) {
        setSuccessMessage('Отдел обновлен успешно');
        setShowEditForm(false);
        setSelectedDepartment(null);
        resetForm();
        loadData();
      } else {
        setError(response.data.error || 'Ошибка обновления отдела');
      }
    } catch (error: any) {
      console.error('Ошибка обновления отдела:', error);
      setError(error.response?.data?.error || 'Ошибка обновления отдела');
    }
  };

  const handleToggleActive = async (departmentId: string) => {
    try {
      const response = await api.patch(`/departments/${departmentId}/toggle-active`);
      
      if (response.data.success) {
        setSuccessMessage(response.data.message);
        loadData();
      } else {
        setError(response.data.error || 'Ошибка изменения статуса отдела');
      }
    } catch (error: any) {
      console.error('Ошибка изменения статуса отдела:', error);
      setError(error.response?.data?.error || 'Ошибка изменения статуса отдела');
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот отдел? Это действие нельзя отменить.')) {
      return;
    }

    try {
      const response = await api.delete(`/departments/${departmentId}`);
      
      if (response.data.success) {
        setSuccessMessage('Отдел удален успешно');
        loadData();
      } else {
        setError(response.data.error || 'Ошибка удаления отдела');
      }
    } catch (error: any) {
      console.error('Ошибка удаления отдела:', error);
      setError(error.response?.data?.error || 'Ошибка удаления отдела');
    }
  };

  const openEditForm = (department: Department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      code: department.code || '',
      head_id: department.head_id || ''
    });
    setShowEditForm(true);
  };

  const closeEditForm = () => {
    setShowEditForm(false);
    setSelectedDepartment(null);
    resetForm();
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка создания */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление отделами</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Создавайте и управляйте отделами организации
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          ➕ Добавить отдел
        </button>
      </div>

      {/* Уведомления */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Список отделов */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {departments.map((department) => (
            <li key={department.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      department.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {department.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {department.name}
                      </p>
                      {department.code && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {department.code}
                        </span>
                      )}
                    </div>
                    {department.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {department.description}
                      </p>
                    )}
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>👥 {department.employee_count || 0} сотрудников</span>
                      {department.head_name && (
                        <span>👔 Руководитель: {department.head_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditForm(department)}
                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleToggleActive(department.id)}
                    className={`text-sm font-medium ${
                      department.is_active
                        ? 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300'
                        : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                    }`}
                  >
                    {department.is_active ? 'Деактивировать' : 'Активировать'}
                  </button>
                  {(department.employee_count || 0) === 0 && (
                    <button
                      onClick={() => handleDeleteDepartment(department.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {departments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Отделы не найдены</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-primary-900 dark:text-primary-200 dark:hover:bg-primary-800"
            >
              Создать первый отдел
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно создания отдела */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Создать новый отдел
              </h3>
              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Код отдела
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="IT, HR, SALES..."
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Руководитель отдела
                  </label>
                  <select
                    value={formData.head_id}
                    onChange={(e) => setFormData({ ...formData, head_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Выберите руководителя</option>
                    {users.filter(user => user.is_active).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeCreateForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Создать
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования отдела */}
      {showEditForm && selectedDepartment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Редактировать отдел
              </h3>
              <form onSubmit={handleUpdateDepartment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Код отдела
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="IT, HR, SALES..."
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Руководитель отдела
                  </label>
                  <select
                    value={formData.head_id}
                    onChange={(e) => setFormData({ ...formData, head_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Выберите руководителя</option>
                    {users.filter(user => user.is_active).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeEditForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Сохранить
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDepartments;
