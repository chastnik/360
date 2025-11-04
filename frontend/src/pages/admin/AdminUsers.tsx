
// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import RoleSelect from './RoleSelect';
import api from '../../services/api';
import { User, Department } from '../../types/common';
import VacationModal from '../../components/VacationModal';

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  role: 'admin' | 'hr' | 'manager' | 'user';
  role_id?: string;
  position: string;
  department: string; // старое поле для совместимости
  department_id: string; // новое поле - ID отдела
  manager_id: string;
  mattermost_username: string;
  avatar_url: string;
  is_manager: boolean;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Управление отпусками для выбранного пользователя
  const [userVacations, setUserVacations] = useState<any[]>([]);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [editingVacation, setEditingVacation] = useState<any | null>(null);

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    role: 'user',
    role_id: '',
    position: '',
    department: '',
    department_id: '',
    manager_id: '',
    mattermost_username: '',
    avatar_url: '',
    is_manager: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [usersResponse, departmentsResponse] = await Promise.all([
        api.get('/users'),
        api.get('/departments')
      ]);
      // Проверяем формат ответа API
      const usersData = usersResponse.data?.success ? usersResponse.data.data : usersResponse.data;
      const departmentsData = departmentsResponse.data?.success ? departmentsResponse.data.data : departmentsResponse.data;
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = {
        ...formData,
        department_id: formData.department_id || undefined,
        manager_id: formData.manager_id || undefined
      };
      
      const response = await api.post('/users', userData);
      
      if (response.data.success) {
        setSuccessMessage(`Пользователь создан. Временный пароль: ${response.data.temporary_password}`);
        setShowCreateForm(false);
        setFormData({
          email: '',
          first_name: '',
          last_name: '',
          middle_name: '',
          role: 'user',
          role_id: '',
          position: '',
          department: '',
          department_id: '',
          manager_id: '',
          mattermost_username: '',
        avatar_url: '',
          is_manager: false
        });
        loadUsers();
      } else {
        setError(response.data.error || 'Ошибка создания пользователя');
      }
    } catch (error: any) {
      console.error('Ошибка создания пользователя:', error);
      setError(error.response?.data?.error || 'Ошибка создания пользователя');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const userData = {
        ...formData,
        department_id: formData.department_id || undefined,
        manager_id: formData.manager_id || undefined
      };
      
      const response = await api.put(`/users/${selectedUser.id}`, userData);
      
      if (response.data.success) {
        setSuccessMessage('Пользователь обновлен');
        // Если выбран файл аватара — загрузим
        if (avatarFile) {
          try {
            setAvatarUploading(true);
            const form = new FormData();
            form.append('avatar', avatarFile);
            await api.post(`/users/${selectedUser.id}/avatar`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
            setSuccessMessage('Пользователь и аватар обновлены');
            setAvatarFile(null);
          } catch (err) {
            console.error('Ошибка загрузки аватара админом', err);
            setError('Пользователь обновлен, но не удалось загрузить аватар');
          } finally {
            setAvatarUploading(false);
          }
        }
        setShowEditForm(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        setError(response.data.error || 'Ошибка обновления пользователя');
      }
    } catch (error: any) {
      console.error('Ошибка обновления пользователя:', error);
      setError(error.response?.data?.error || 'Ошибка обновления пользователя');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!window.confirm('Вы уверены, что хотите деактивировать этого пользователя?')) {
      return;
    }

    try {
      await api.patch(`/users/${userId}/deactivate`);
      setSuccessMessage('Пользователь деактивирован');
      loadUsers();
    } catch (error: any) {
      console.error('Ошибка деактивации пользователя:', error);
      setError(error.response?.data?.error || 'Ошибка деактивации пользователя');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await api.patch(`/users/${userId}/activate`);
      setSuccessMessage('Пользователь активирован');
      loadUsers();
    } catch (error: any) {
      console.error('Ошибка активации пользователя:', error);
      setError(error.response?.data?.error || 'Ошибка активации пользователя');
    }
  };

  const openEditForm = async (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || '',
      role: user.role,
      role_id: (user as any).role_id || '',
      position: user.position || '',
      department: user.department || '',
      department_id: user.department_id || '',
      manager_id: user.manager_id || '',
      mattermost_username: user.mattermost_username || '',
      avatar_url: (user as any).avatar_url || '',
      is_manager: user.is_manager || false
    });
    
    // Загружаем отпуска пользователя
    try {
      const vacationsResponse = await api.get(`/vacations?user_id=${user.id}`);
      const vacationsData = vacationsResponse.data?.success ? vacationsResponse.data.data : vacationsResponse.data;
      setUserVacations(Array.isArray(vacationsData) ? vacationsData : []);
    } catch (error) {
      console.error('Ошибка загрузки отпусков:', error);
      setUserVacations([]);
    }
    
    setShowEditForm(true);
  };

  const filteredUsers = Array.isArray(users) ? users
    .filter(user =>
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Сортировка по имени (first_name), затем по фамилии (last_name)
      const firstNameComparison = a.first_name.localeCompare(b.first_name, 'ru');
      if (firstNameComparison !== 0) {
        return firstNameComparison;
      }
      return a.last_name.localeCompare(b.last_name, 'ru');
    }) : [];

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'hr': return 'HR';
      case 'user': return 'Пользователь';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'hr': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
            Управление пользователями
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Добавляйте, редактируйте и управляйте пользователями системы
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Добавить пользователя
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

      {/* Поиск */}
      <div className="max-w-md">
        <label htmlFor="search" className="sr-only">
          Поиск пользователей
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            id="search"
            name="search"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Поиск пользователей..."
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Таблица пользователей */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredUsers.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name}
                        </p>
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                          {getRoleText(user.role)}
                        </span>
                        {!user.is_active && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Неактивен
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <p>{user.email}</p>
                        {user.position && (
                          <>
                            <span className="mx-2">•</span>
                            <p>{user.position}</p>
                          </>
                        )}
                        {user.department && (
                          <>
                            <span className="mx-2">•</span>
                            <p>{user.department}</p>
                          </>
                        )}
                        {user.manager_id && (
                          <>
                            <span className="mx-2">•</span>
                            <p>Рук.: {Array.isArray(users) ? users.find(u => u.id === user.manager_id)?.first_name + ' ' + users.find(u => u.id === user.manager_id)?.last_name || 'Не найден' : 'Загрузка...'}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditForm(user)}
                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Редактировать
                    </button>
                    {user.is_active ? (
                      <button
                        onClick={() => handleDeactivateUser(user.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Деактивировать
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateUser(user.id)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      >
                        Активировать
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Модальные окна */}
      {(showCreateForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {showCreateForm ? 'Создать пользователя' : 'Редактировать пользователя'}
            </h3>
            
            <form onSubmit={showCreateForm ? handleCreateUser : handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Имя *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Фамилия *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Отчество
                </label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({...formData, middle_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Роль (из справочника)
                </label>
                <RoleSelect value={formData.role_id || ''} onChange={(id)=> setFormData({...formData, role_id: id})} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Должность
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Отдел
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Выберите отдел</option>
                  {departments.filter(dept => dept.is_active).map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Руководитель
                </label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({...formData, manager_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Выберите руководителя</option>
                  {Array.isArray(users) ? users
                    .filter(user => user.is_active && user.id !== selectedUser?.id && user.is_manager)
                    .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.position || user.role})
                    </option>
                  )) : null}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mattermost username
                </label>
                <input
                  type="text"
                  value={formData.mattermost_username}
                  onChange={(e) => setFormData({...formData, mattermost_username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="@username"
                />
              </div>

              {/* Предпросмотр аватара */}
              {selectedUser && (
                <div className="flex items-center gap-3">
                  <img src={`/api/users/${selectedUser.id}/avatar`} onError={(e:any)=>{e.currentTarget.style.display='none';}} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Текущий аватар</span>
                </div>
              )}
              {selectedUser && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Загрузить новый аватар</label>
                  <input type="file" accept="image/*" onChange={(e)=> setAvatarFile(e.target.files?.[0] || null)} className="text-sm" />
                  {avatarFile && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Выбран файл: {avatarFile.name}</div>
                  )}
                </div>
              )}
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.is_manager}
                    onChange={(e) => setFormData({...formData, is_manager: e.target.checked})}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Является руководителем
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Пользователи с этой отметкой будут доступны для выбора в качестве руководителей других сотрудников
                </p>
              </div>

              {/* Секция управления отпусками (только при редактировании) */}
              {showEditForm && selectedUser && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      Отпуска пользователя
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        // Сбрасываем редактирование отпуска и устанавливаем выбранного пользователя
                        setEditingVacation(null);
                        setShowVacationModal(true);
                      }}
                      className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md"
                    >
                      + Добавить отпуск
                    </button>
                  </div>

                  {userVacations.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userVacations
                        .filter((v: any) => v.status !== 'rejected')
                        .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                        .map((vacation: any) => (
                          <div
                            key={vacation.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {new Date(vacation.start_date).toLocaleDateString('ru-RU') === new Date(vacation.end_date).toLocaleDateString('ru-RU')
                                    ? new Date(vacation.start_date).toLocaleDateString('ru-RU')
                                    : `${new Date(vacation.start_date).toLocaleDateString('ru-RU')} - ${new Date(vacation.end_date).toLocaleDateString('ru-RU')}`}
                                </span>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {vacation.days_count} {vacation.days_count === 1 ? 'день' : vacation.days_count < 5 ? 'дня' : 'дней'}
                                </span>
                                {vacation.status === 'pending' && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                    На рассмотрении
                                  </span>
                                )}
                                {vacation.status === 'approved' && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Утверждено
                                  </span>
                                )}
                              </div>
                              {vacation.comment && (
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{vacation.comment}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingVacation(vacation);
                                  setShowVacationModal(true);
                                }}
                                className="px-2 py-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm('Вы уверены, что хотите удалить этот отпуск?')) return;
                                  try {
                                    await api.delete(`/vacations/${vacation.id}`);
                                    const vacationsResponse = await api.get(`/vacations?user_id=${selectedUser.id}`);
                                    const vacationsData = vacationsResponse.data?.success ? vacationsResponse.data.data : vacationsResponse.data;
                                    setUserVacations(Array.isArray(vacationsData) ? vacationsData : []);
                                  } catch (error: any) {
                                    alert(error.response?.data?.error || 'Ошибка удаления отпуска');
                                  }
                                }}
                                className="px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Удалить
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                      Отпуска не запланированы
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowEditForm(false);
                    setSelectedUser(null);
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

      {/* Модальное окно для отпусков */}
      {showVacationModal && selectedUser && (
        <VacationModal
          isOpen={showVacationModal}
          onClose={() => {
            setShowVacationModal(false);
            setEditingVacation(null);
          }}
          onSave={async (vacationData) => {
            try {
              console.log('💾 Сохранение отпуска (Admin):', vacationData, 'selectedUser:', selectedUser);
              // Убеждаемся, что user_id присутствует в данных (всегда используем selectedUser.id)
              const dataToSend = {
                ...vacationData,
                user_id: selectedUser.id
              };
              if (editingVacation) {
                await api.put(`/vacations/${editingVacation.id}`, dataToSend);
              } else {
                await api.post('/vacations', dataToSend);
              }
              // Перезагружаем отпуска
              const vacationsResponse = await api.get(`/vacations?user_id=${selectedUser.id}`);
              const vacationsData = vacationsResponse.data?.success ? vacationsResponse.data.data : vacationsResponse.data;
              setUserVacations(Array.isArray(vacationsData) ? vacationsData : []);
              setShowVacationModal(false);
              setEditingVacation(null);
            } catch (error: any) {
              console.error('Ошибка сохранения отпуска:', error);
              alert(error.response?.data?.error || 'Ошибка сохранения отпуска');
              throw error;
            }
          }}
          vacation={editingVacation}
          users={users}
          preselectedUserId={selectedUser.id}
        />
      )}
    </div>
  );
};

export default AdminUsers; 