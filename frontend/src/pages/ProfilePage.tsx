// Автор: Стас Чашин @chastnik
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, Department } from '../types/common';

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Данные для отображения
  const [manager, setManager] = useState<User | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);

  // Данные формы профиля
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    position: user?.position || '',
    department: user?.department || ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Данные формы смены пароля
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

const loadAdditionalData = useCallback(async () => {
    if (!user) return;

    try {
      // Сначала загружаем свежие данные пользователя
      const currentUserResponse = await api.get(`/users/${user.id}`);
      const currentUserData = currentUserResponse.data?.success ? currentUserResponse.data.data : currentUserResponse.data;
      
      // Обновляем пользователя в контексте, если данные изменились
      if (currentUserData && (
        currentUserData.position !== user.position ||
        currentUserData.department_id !== user.department_id ||
        currentUserData.manager_id !== user.manager_id ||
        currentUserData.department !== user.department
      )) {
        setUser(currentUserData);
      }

      const promises = [];
      
      // Загрузка данных о руководителе (используем свежие данные)
      if (currentUserData.manager_id) {
        promises.push(
          api.get(`/users/${currentUserData.manager_id}`)
            .then(response => {
              const managerData = response.data?.success ? response.data.data : response.data;
              setManager(managerData);
            })
            .catch(error => {
              console.error('Ошибка загрузки данных руководителя:', error);
            })
        );
      } else {
        setManager(null);
      }

      // Загрузка данных об отделе (используем свежие данные)
      if (currentUserData.department_id) {
        promises.push(
          api.get(`/departments/${currentUserData.department_id}`)
            .then(response => {
              const departmentData = response.data?.success ? response.data.data : response.data;
              setDepartment(departmentData);
            })
            .catch(error => {
              console.error('Ошибка загрузки данных отдела:', error);
            })
        );
      } else {
        setDepartment(null);
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Ошибка загрузки дополнительных данных:', error);
    }
  }, [user, setUser]);

  // Загрузка дополнительных данных
  useEffect(() => {
    loadAdditionalData();
  }, [loadAdditionalData]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.put('/users/profile', profileData);
      
      if (response.data?.user) {
        setUser(response.data.user);
        setSuccess('Профиль успешно обновлен');
        setEditing(false);
      }
    } catch (error: any) {
      console.error('Ошибка при обновлении профиля:', error);
      setError('Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Новые пароли не совпадают');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('Новый пароль должен содержать не менее 6 символов');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.put('/users/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      setSuccess('Пароль успешно изменен');
      setChangingPassword(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error: any) {
      console.error('Ошибка при смене пароля:', error);
      setError('Не удалось изменить пароль. Проверьте текущий пароль.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditing(false);
    setProfileData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      position: user?.position || '',
      department: user?.department || ''
    });
    setError(null);
  };

  const handleAvatarUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarFile) return;
    try {
      setAvatarUploading(true);
      const form = new FormData();
      form.append('avatar', avatarFile);
      await api.post('/users/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Аватар обновлён');
      setAvatarFile(null);
      await loadAdditionalData();
    } catch (err) {
      console.error('Upload error', err);
      setError('Не удалось загрузить аватар');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordCancel = () => {
    setChangingPassword(false);
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setError(null);
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'user': return 'Пользователь';
      default: return 'Неизвестно';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 dark:text-gray-400">
          Информация о пользователе недоступна
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Профиль пользователя
        </h1>
        <div className="flex gap-3">
          {!editing && !changingPassword && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Редактировать
              </button>
              <button
                onClick={() => setChangingPassword(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Сменить пароль
              </button>
              <button
                onClick={loadAdditionalData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                title="Обновить данные профиля"
              >
                🔄 Обновить
              </button>
            </>
          )}
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Основная информация
            </h2>
            
            {!editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Имя
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {user.first_name || 'Не указано'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Фамилия
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {user.last_name || 'Не указано'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {user.email}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Должность
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {user.position || 'Не указано'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Назначается администратором
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Отдел
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {department ? department.name : (user.department || 'Не указано')}
                  </p>
                  {department?.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {department.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Назначается администратором
                  </p>
                </div>
                
                {(user.manager_id || manager) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Руководитель
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {manager ? `${manager.first_name} ${manager.last_name}` : 'Загрузка...'}
                    </p>
                    {manager?.position && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {manager.position}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Назначается администратором
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Имя *
                    </label>
                    <input
                      type="text"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
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
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 mt-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Примечание:</strong> Должность, отдел и руководитель назначаются администратором и не могут быть изменены самостоятельно.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Форма смены пароля */}
          {changingPassword && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Изменение пароля
              </h2>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Текущий пароль *
                  </label>
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Новый пароль *
                  </label>
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    minLength={6}
                    required
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Минимум 6 символов
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Подтвердите новый пароль *
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handlePasswordCancel}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Изменение...' : 'Изменить пароль'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Боковая панель с дополнительной информацией */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Информация об аккаунте
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Аватар</label>
                <div className="flex items-center gap-3">
                  <img src={`/api/users/${user.id}/avatar`} onError={(e:any)=>{e.currentTarget.style.display='none';}} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                  <form onSubmit={handleAvatarUpload} className="flex items-center gap-2">
                    <input type="file" accept="image/*" onChange={(e)=> setAvatarFile(e.target.files?.[0] || null)} className="text-sm" />
                    <button type="submit" disabled={!avatarFile || avatarUploading} className="px-2 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded disabled:opacity-50">{avatarUploading?'Загрузка...':'Загрузить'}</button>
                  </form>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Роль
                </label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {getRoleText(user.role)}
                </span>
              </div>
              
              {user.created_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Дата регистрации
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm">
                    {new Date(user.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
              
              {user.updated_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Последнее обновление
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm">
                    {new Date(user.updated_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Статистика (если доступна) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Статистика
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Пройдено оценок:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  -
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Создано циклов:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  -
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Средний балл:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  -
                </span>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Статистика будет доступна после участия в оценках
            </p>
          </div>

          {/* Информация о системе оценки */}
          {user.manager_id && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 mt-6">
              <h2 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">
                💡 Информация о системе оценки
              </h2>
              
              <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                <p>
                  <strong>Автоматическое включение руководителя:</strong> При прохождении 360° оценки ваш руководитель будет автоматически добавлен в список респондентов, даже если вы его не выберете.
                </p>
                <p>
                  <strong>Конфиденциальность:</strong> Все оценки анонимны, и даже руководитель не будет знать, кто именно его оценивал.
                </p>
                <p>
                  <strong>Цель:</strong> Это обеспечивает более полную картину ваших профессиональных качеств для развития и планирования карьеры.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};