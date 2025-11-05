// Автор: Стас Чашин @chastnik
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, Department } from '../types/common';
import Avatar from '../components/Avatar';
import { Link } from 'react-router-dom';
import VacationModal from '../components/VacationModal';

export const ProfilePage: React.FC = () => {
  const { user, setUser, permissions } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Данные для отображения
  const [manager, setManager] = useState<User | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);

  // Данные формы профиля
  const [name, setName] = useState(`${user?.first_name || ''} ${user?.last_name || ''}`.trim());
  const [email, setEmail] = useState(user?.email || '');
  const [position, setPosition] = useState(user?.position || '');
  const [departmentName, setDepartmentName] = useState(user?.department || '');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // История циклов/оценок
  const [pastCycles, setPastCycles] = useState<any[]>([]);

  // Управление отпусками
  const [vacations, setVacations] = useState<any[]>([]);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [editingVacation, setEditingVacation] = useState<any | null>(null);
  const [vacationLoading, setVacationLoading] = useState(false);

  // Флаг для предотвращения множественных одновременных загрузок
  const isLoadingDataRef = useRef(false);

  const loadAdditionalData = useCallback(async () => {
    if (!user?.id) return;
    
    // Предотвращаем множественные одновременные загрузки
    if (isLoadingDataRef.current) {
      console.log('⚠️ Загрузка данных уже выполняется, пропускаем запрос');
      return;
    }
    
    isLoadingDataRef.current = true;

    try {
      // Сначала загружаем свежие данные пользователя
      const currentUserResponse = await api.get(`/users/${user.id}`);
      const currentUserData = currentUserResponse.data?.success ? currentUserResponse.data.data : currentUserResponse.data;
      
      // Обновляем форму, но не обновляем пользователя в контексте, чтобы избежать бесконечного цикла
      if (currentUserData) {
        // Обновляем пользователя в контексте только если данные действительно изменились
        const userChanged = 
          currentUserData.first_name !== user.first_name ||
          currentUserData.last_name !== user.last_name ||
          currentUserData.email !== user.email ||
          currentUserData.position !== user.position ||
          currentUserData.department !== user.department;
        
        if (userChanged) {
          setUser(currentUserData);
        }
        
        setName(`${currentUserData.first_name || ''} ${currentUserData.last_name || ''}`.trim());
        setEmail(currentUserData.email || '');
        setPosition(currentUserData.position || '');
        setDepartmentName(currentUserData.department || '');
      }

      const promises = [];
      
      // Загрузка данных о руководителе
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

      // Загрузка данных об отделе
      if (currentUserData.department_id) {
        promises.push(
          api.get(`/departments/${currentUserData.department_id}`)
            .then(response => {
              const departmentData = response.data?.success ? response.data.data : response.data;
              setDepartment(departmentData);
              if (departmentData?.name) {
                setDepartmentName(departmentData.name);
              }
            })
            .catch(error => {
              console.error('Ошибка загрузки данных отдела:', error);
            })
        );
      } else {
        setDepartment(null);
      }

      // Загрузка истории циклов
      try {
        const cyclesResponse = await api.get('/cycles');
        const cycles = cyclesResponse.data?.success ? cyclesResponse.data.data : cyclesResponse.data || [];
        // Фильтруем завершенные циклы, в которых участвовал пользователь
        const completedCycles = Array.isArray(cycles) ? cycles.filter((cycle: any) => 
          cycle.status === 'completed' || cycle.status === 'closed'
        ).slice(0, 10) : [];
        setPastCycles(completedCycles);
      } catch (error) {
        console.error('Ошибка загрузки циклов:', error);
      }

      // Загрузка отпусков пользователя
      try {
        const vacationsResponse = await api.get(`/vacations?user_id=${currentUserData.id}`);
        const vacationsData = vacationsResponse.data?.success ? vacationsResponse.data.data : vacationsResponse.data;
        setVacations(Array.isArray(vacationsData) ? vacationsData : []);
      } catch (error) {
        console.error('Ошибка загрузки отпусков:', error);
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Ошибка загрузки дополнительных данных:', error);
    } finally {
      isLoadingDataRef.current = false;
    }
  }, [user?.id, setUser]); // Используем только user.id, чтобы избежать бесконечного цикла

  // Загрузка дополнительных данных (только один раз при монтировании или изменении user.id)
  useEffect(() => {
    if (user?.id) {
      loadAdditionalData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Используем только user.id, loadAdditionalData не включаем в зависимости

  // Обновление формы при изменении пользователя
  useEffect(() => {
    if (user) {
      setName(`${user.first_name || ''} ${user.last_name || ''}`.trim());
      setEmail(user.email || '');
      setPosition(user.position || '');
      setDepartmentName(user.department || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Разделяем имя и фамилию
      const nameParts = name.trim().split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      const response = await api.put('/users/profile', {
        first_name,
        last_name,
        email
      });
      
      if (response.data?.user) {
        setUser(response.data.user);
        setSuccess('Профиль успешно обновлен');
      }
    } catch (error: any) {
      console.error('Ошибка при обновлении профиля:', error);
      setError('Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    try {
      setAvatarUploading(true);
      const form = new FormData();
      form.append('avatar', avatarFile);
      await api.post('/users/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Аватар обновлён');
      setAvatarFile(null);
      setAvatarVersion(prev => prev + 1);
      await loadAdditionalData();
    } catch (err) {
      console.error('Upload error', err);
      setError('Не удалось загрузить аватар');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      handleAvatarUpload();
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

  const getInitials = () => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Настройки профиля</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Управляйте личной информацией и историей оценок</p>
      </div>

      {/* Уведомления */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Карточка личной информации */}
      <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Личная информация</h2>

        <div className="flex items-start gap-8 mb-8">
          {/* Аватар */}
          <div className="relative flex-shrink-0">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Avatar userId={user.id} size={128} version={avatarVersion} fallback={<span className="text-4xl">{getInitials()}</span>} />
            </div>
            <button
              onClick={handleAvatarClick}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 p-2 bg-primary-600 dark:bg-primary-500 text-white rounded-full hover:bg-primary-700 dark:hover:bg-primary-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Изменить аватар"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Форма */}
          <form onSubmit={handleProfileSubmit} className="flex-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="label text-gray-900 dark:text-white">
                  Полное имя
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="position" className="label text-gray-900 dark:text-white">
                  Должность
                </label>
                <input
                  id="position"
                  type="text"
                  value={position}
                  disabled
                  className="input bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Назначается администратором</p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="department" className="label text-gray-900 dark:text-white">
                Отдел
              </label>
              <input
                id="department"
                type="text"
                value={department ? department.name : departmentName}
                disabled
                className="input bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Назначается администратором</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="email" className="label text-gray-900 dark:text-white">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="label text-gray-900 dark:text-white">
                  Руководитель
                </label>
                <input
                  type="text"
                  value={manager ? `${manager.first_name} ${manager.last_name}` : 'Не указано'}
                  disabled
                  className="input bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Сохранить изменения
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Карточка отпусков */}
      <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Мои отпуска</h2>
          <button
            onClick={() => {
              setEditingVacation(null);
              setShowVacationModal(true);
            }}
            className="btn btn-primary btn-sm"
          >
            + Добавить отпуск
          </button>
        </div>

        {vacations.length > 0 ? (
          <div className="space-y-3">
            {vacations
              .filter((v: any) => v.status !== 'rejected')
              .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
              .map((vacation: any) => (
                <div
                  key={vacation.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(vacation.start_date).toLocaleDateString('ru-RU') === new Date(vacation.end_date).toLocaleDateString('ru-RU')
                          ? new Date(vacation.start_date).toLocaleDateString('ru-RU')
                          : `${new Date(vacation.start_date).toLocaleDateString('ru-RU')} - ${new Date(vacation.end_date).toLocaleDateString('ru-RU')}`}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {vacation.days_count} {vacation.days_count === 1 ? 'день' : vacation.days_count < 5 ? 'дня' : 'дней'}
                      </span>
                      {vacation.type === 'vacation' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Отпуск
                        </span>
                      )}
                      {vacation.status === 'pending' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          На рассмотрении
                        </span>
                      )}
                      {vacation.status === 'approved' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Утверждено
                        </span>
                      )}
                    </div>
                    {vacation.comment && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{vacation.comment}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditingVacation(vacation);
                      setShowVacationModal(true);
                    }}
                    className="ml-4 px-3 py-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    Редактировать
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Отпуска не запланированы</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Добавьте отпуск, чтобы он учитывался при расчете ПИР</p>
          </div>
        )}
      </div>

      {/* Карточка истории обратной связи */}
      <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">История оценок</h2>

        {pastCycles.length > 0 ? (
          <div className="space-y-4">
            {pastCycles.map((cycle) => (
              <div
                key={cycle.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{cycle.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {cycle.end_date ? new Date(cycle.end_date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'Дата не указана'}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {cycle.status && (
                    <div className="text-center">
                      <div className="text-primary-600 dark:text-primary-400 font-semibold mb-1">
                        {cycle.overall_average ? cycle.overall_average.toFixed(2) : '-'}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Балл</p>
                    </div>
                  )}

                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    cycle.status === 'completed' || cycle.status === 'closed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {cycle.status === 'completed' || cycle.status === 'closed' ? '✓ Завершен' : cycle.status}
                  </span>

                  <Link
                    to={`/cycles`}
                    className="btn btn-outline btn-sm"
                  >
                    Просмотр отчета
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">История оценок пока недоступна</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Статистика появится после участия в циклах оценки</p>
          </div>
        )}
      </div>

      {/* Модальное окно для отпусков */}
      <VacationModal
        isOpen={showVacationModal}
        onClose={() => {
          setShowVacationModal(false);
          setEditingVacation(null);
        }}
        onSave={async (vacationData) => {
          // Предотвращаем множественные запросы
          if (vacationLoading) {
            console.log('⚠️ Сохранение уже выполняется, игнорируем повторный запрос');
            return;
          }

          try {
            setVacationLoading(true);
            console.log('💾 Сохранение отпуска:', vacationData);
            if (editingVacation) {
              // При редактировании не отправляем user_id и status (если у пользователя нет прав)
              const canUpdateOthers = permissions?.includes('action:vacations:update') || false;
              const dataToSend: any = {
                start_date: vacationData.start_date,
                end_date: vacationData.end_date,
                type: vacationData.type,
                comment: vacationData.comment
              };
              // Только пользователи с правами могут менять статус
              if (canUpdateOthers && vacationData.status) {
                dataToSend.status = vacationData.status;
              }
              const response = await api.put(`/vacations/${editingVacation.id}`, dataToSend);
              // Используем обновленный отпуск из ответа вместо повторного запроса
              if (response.data?.success && response.data?.data) {
                setVacations(prev => {
                  const updated = prev.map(v => v.id === editingVacation.id ? response.data.data : v);
                  return updated;
                });
              } else {
                // Перезагружаем отпуска только если не получили обновленные данные
                const vacationsResponse = await api.get(`/vacations?user_id=${user?.id}`);
                const vacationsData = vacationsResponse.data?.success ? vacationsResponse.data.data : vacationsResponse.data;
                setVacations(Array.isArray(vacationsData) ? vacationsData : []);
              }
            } else {
              // При создании убеждаемся, что user_id присутствует в данных
              const dataToSend = {
                ...vacationData,
                user_id: vacationData.user_id || user?.id
              };
              await api.post('/vacations', dataToSend);
              // Перезагружаем отпуска после создания
              const vacationsResponse = await api.get(`/vacations?user_id=${user?.id}`);
              const vacationsData = vacationsResponse.data?.success ? vacationsResponse.data.data : vacationsResponse.data;
              setVacations(Array.isArray(vacationsData) ? vacationsData : []);
            }
            setShowVacationModal(false);
            setEditingVacation(null);
          } catch (error: any) {
            console.error('Ошибка сохранения отпуска:', error);
            console.error('Детали ошибки:', {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
              stack: error.stack
            });
            const errorMessage = error.response?.data?.error || error.message || 'Ошибка сохранения отпуска';
            alert(errorMessage);
            throw error;
          } finally {
            setVacationLoading(false);
          }
        }}
        vacation={editingVacation}
        users={user ? [user] : []}
      />
    </div>
  );
};