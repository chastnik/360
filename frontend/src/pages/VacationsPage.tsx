
// Автор: Стас Чашин @chastnik
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import VacationModal from '../components/VacationModal';

// Типы данных
interface User {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  position?: string;
  department?: string;
  department_id?: string;
  manager_id?: string;
}

interface Vacation {
  id: string;
  user_id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  days_count: number;
  type: 'vacation' | 'sick' | 'personal' | 'business';
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

interface Department {
  id: string;
  name: string;
}

const VacationsPage: React.FC = () => {
  const { user } = useAuth();
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Фильтры
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Модальное окно для добавления/редактирования отпуска
  const [showModal, setShowModal] = useState(false);
  const [editingVacation, setEditingVacation] = useState<Vacation | null>(null);

  // Проверка прав доступа
  const canEdit = user?.role === 'admin' || user?.role === 'hr';

  // Загрузка пользователей и отделов (один раз)
  useEffect(() => {
    const loadUsersAndDepartments = async () => {
      try {
        const usersRes = await api.get('/users');
        const usersData = usersRes.data?.success ? usersRes.data.data : usersRes.data;
        
        setUsers(Array.isArray(usersData) ? usersData : []);

        // Извлекаем уникальные отделы из пользователей
        const uniqueDepartments = Array.from(
          new Set(usersData.filter((u: User) => u.department).map((u: User) => u.department))
        ).map(dept => ({ id: dept as string, name: dept as string }));
        setDepartments(uniqueDepartments);
      } catch (err: any) {
        console.error('Ошибка загрузки пользователей:', err);
        setError('Не удалось загрузить пользователей');
      }
    };

    loadUsersAndDepartments();
  }, []);

  // Загрузка отпусков с фильтрами
  useEffect(() => {
    const loadVacations = async () => {
      try {
        setLoading(true);
        
        // Формируем параметры запроса для фильтрации
        const params = new URLSearchParams();
        if (selectedUser) params.append('user_id', selectedUser);
        if (selectedDepartment) {
          params.append('department_id', selectedDepartment);
        }
        if (selectedManager) params.append('manager_id', selectedManager);
        if (selectedYear) params.append('year', selectedYear.toString());

        const vacationsRes = await api.get(`/vacations?${params.toString()}`);
        const vacationsData = vacationsRes.data?.success ? vacationsRes.data.data : vacationsRes.data;

        console.log('Загружены отпуска:', vacationsData);
        console.log('Параметры фильтрации:', params.toString());
        
        setVacations(Array.isArray(vacationsData) ? vacationsData : []);
        setError(null);
      } catch (err: any) {
        console.error('Ошибка загрузки отпусков:', err);
        setError('Не удалось загрузить отпуска');
      } finally {
        setLoading(false);
      }
    };

    loadVacations();
  }, [selectedUser, selectedDepartment, selectedManager, selectedYear]);

  // Отпуска уже отфильтрованы на сервере
  const filteredVacations = vacations;

  // Фильтруем пользователей для статистики (та же логика, что и для отображения)
  const filteredUsers = users.filter(user => {
    // Если нет активных фильтров, показываем всех
    if (!selectedUser && !selectedDepartment && !selectedManager) {
      return true;
    }
    
    // Если выбран конкретный пользователь
    if (selectedUser && user.id !== selectedUser) {
      return false;
    }
    
    // Если выбран отдел
    if (selectedDepartment && user.department !== selectedDepartment) {
      return false;
    }
    
    // Если выбран руководитель
    if (selectedManager && user.manager_id !== selectedManager) {
      return false;
    }
    
    return true;
  });

  // Пользователи без отпусков (из отфильтрованных)
  const usersWithoutVacations = filteredUsers.filter(user => 
    !filteredVacations.some(vacation => vacation.user_id === user.id)
  );

  // Получение менеджеров
  const managers = useMemo(() => {
    return users.filter(user => users.some(u => u.manager_id === user.id));
  }, [users]);

  // Генерация месяцев для календаря
  const months = useMemo(() => {
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    return monthNames.map((name, index) => ({
      name,
      number: index + 1,
      daysInMonth: new Date(selectedYear, index + 1, 0).getDate(),
      firstDay: new Date(selectedYear, index, 1).getDay()
    }));
  }, [selectedYear]);

  const getVacationTypeColor = (type: string) => {
    switch (type) {
      case 'vacation': return 'bg-blue-500';
      case 'sick': return 'bg-red-500';
      case 'personal': return 'bg-green-500';
      case 'business': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getVacationTypeLabel = (type: string) => {
    switch (type) {
      case 'vacation': return 'Отпуск';
      case 'sick': return 'Больничный';
      case 'personal': return 'Личный';
      case 'business': return 'Командировка';
      default: return 'Неизвестно';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleAddVacation = () => {
    setEditingVacation(null);
    setShowModal(true);
  };

  const handleEditVacation = (vacation: Vacation) => {
    setEditingVacation(vacation);
    setShowModal(true);
  };

  const handleSaveVacation = async (vacationData: any) => {
    try {
      if (editingVacation) {
        // Обновление существующего отпуска
        await api.put(`/vacations/${editingVacation.id}`, vacationData);
      } else {
        // Создание нового отпуска
        await api.post('/vacations', vacationData);
      }
      
      // Перезагружаем данные
      const vacationsRes = await api.get('/vacations');
      const vacationsData = vacationsRes.data?.success ? vacationsRes.data.data : vacationsRes.data;
      setVacations(Array.isArray(vacationsData) ? vacationsData : []);
      
      setShowModal(false);
      setEditingVacation(null);
    } catch (error: any) {
      console.error('Ошибка сохранения отпуска:', error);
      alert(error.response?.data?.error || 'Ошибка сохранения отпуска');
      throw error;
    }
  };

  const handleDeleteVacation = async (vacationId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот отпуск?')) {
      return;
    }

    try {
      await api.delete(`/vacations/${vacationId}`);
      
      // Обновляем список отпусков
      setVacations(prev => prev.filter(v => v.id !== vacationId));
    } catch (error: any) {
      console.error('Ошибка удаления отпуска:', error);
      alert(error.response?.data?.error || 'Ошибка удаления отпуска');
    }
  };

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
    <div className="space-y-6">
      {/* Заголовок и кнопка добавления */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Календарь отпусков
        </h2>
        {canEdit && (
          <button
            onClick={handleAddVacation}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
          >
            + Добавить отпуск
          </button>
        )}
      </div>

      {/* Фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Год */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Год
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Сотрудник */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Сотрудник
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Все сотрудники</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.last_name} {user.first_name}
                </option>
              ))}
            </select>
          </div>

          {/* Отдел */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Отдел
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Все отделы</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Руководитель */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Руководитель
            </label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Все руководители</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.last_name} {manager.first_name}
                </option>
              ))}
            </select>
          </div>

          {/* Сброс фильтров */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedUser('');
                setSelectedDepartment('');
                setSelectedManager('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {/* Легенда */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Типы отпусков:</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Отпуск</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Больничный</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Личный</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Командировка</span>
          </div>
        </div>
      </div>

      {/* Календарь Гант */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Загрузка отпусков...</span>
          </div>
        )}
        {!loading && (
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Заголовки месяцев */}
            <div className="flex border-b-2 border-gray-300 dark:border-gray-600">
              <div className="w-48 flex-shrink-0 p-3 bg-gray-50 dark:bg-gray-700 font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                Сотрудник
              </div>
              {months.map(month => (
                <div
                  key={month.number}
                  className="w-32 flex-shrink-0 p-3 bg-gray-50 dark:bg-gray-700 font-medium text-gray-900 dark:text-white text-center border-l border-gray-200 dark:border-gray-700"
                >
                  {month.name}
                </div>
              ))}
            </div>

            {/* Строки сотрудников */}
            {users.filter(user => {
              // Если нет активных фильтров, показываем всех
              if (!selectedUser && !selectedDepartment && !selectedManager) {
                return true;
              }
              
              console.log(`Проверяем пользователя ${user.first_name} ${user.last_name}:`, {
                selectedManager,
                userManagerId: user.manager_id,
                selectedDepartment,
                userDepartment: user.department,
                selectedUser,
                userId: user.id
              });
              
              // Если выбран конкретный пользователь
              if (selectedUser && user.id !== selectedUser) {
                return false;
              }
              
              // Если выбран отдел
              if (selectedDepartment && user.department !== selectedDepartment) {
                return false;
              }
              
              // Если выбран руководитель
              if (selectedManager && user.manager_id !== selectedManager) {
                return false;
              }
              
              return true;
            }).map(user => {
              const userVacations = filteredVacations.filter(v => v.user_id === user.id);
              
              return (
                <div key={user.id} className="flex border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 min-h-[60px]">
                  {/* Имя сотрудника */}
                  <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.last_name} {user.first_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.position || '—'}
                    </div>
                  </div>

                  {/* Месяцы */}
                  {months.map(month => (
                    <div
                      key={month.number}
                      className="w-32 flex-shrink-0 p-2 border-l border-gray-200 dark:border-gray-700 relative min-h-[60px]"
                    >
                      {/* Отпуска в этом месяце */}
                      {userVacations.map(vacation => {
                        const startDate = new Date(vacation.start_date);
                        const endDate = new Date(vacation.end_date);
                        const monthStart = new Date(selectedYear, month.number - 1, 1);
                        const monthEnd = new Date(selectedYear, month.number, 0);

                        // Проверяем, пересекается ли отпуск с этим месяцем
                        if (endDate < monthStart || startDate > monthEnd) {
                          return null;
                        }

                        // Вычисляем позицию и ширину полосы отпуска
                        const vacationStart = startDate < monthStart ? monthStart : startDate;
                        const vacationEnd = endDate > monthEnd ? monthEnd : endDate;
                        
                        const startDay = vacationStart.getDate();
                        const endDay = vacationEnd.getDate();
                        const totalDays = month.daysInMonth;
                        
                        const leftPercent = ((startDay - 1) / totalDays) * 100;
                        const widthPercent = ((endDay - startDay + 1) / totalDays) * 100;

                        return (
                          <div
                            key={vacation.id}
                            className={`absolute top-1 h-4 rounded text-xs text-white flex items-center justify-center cursor-pointer ${getVacationTypeColor(vacation.type)}`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              minWidth: '20px'
                            }}
                            title={`${getVacationTypeLabel(vacation.type)}: ${formatDate(vacation.start_date)} - ${formatDate(vacation.end_date)} (${vacation.days_count} дн.)`}
                            onClick={() => canEdit && handleEditVacation(vacation)}
                            onDoubleClick={() => canEdit && handleDeleteVacation(vacation.id)}
                          >
                            {vacation.days_count > 3 && (
                              <span className="text-xs font-medium">{vacation.days_count}д</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {filteredVacations.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Всего отпусков
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {filteredUsers.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Сотрудников
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {usersWithoutVacations.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Без отпуска
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {filteredVacations.reduce((sum, v) => sum + v.days_count, 0)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Всего дней
          </div>
        </div>
      </div>

      {/* Модальное окно для добавления/редактирования отпуска */}
      <VacationModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingVacation(null);
        }}
        onSave={handleSaveVacation}
        vacation={editingVacation}
        users={users}
      />
    </div>
  );
};

export default VacationsPage;
