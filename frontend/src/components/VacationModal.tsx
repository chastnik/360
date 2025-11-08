
// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  position?: string;
  department?: string;
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
}

interface VacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vacationData: any) => Promise<void>;
  vacation?: Vacation | null;
  users: User[];
  preselectedUserId?: string; // ID пользователя, который должен быть предустановлен
}

const VacationModal: React.FC<VacationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vacation,
  users,
  preselectedUserId
}) => {
  const { user, permissions } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    user_id: string;
    start_date: string;
    end_date: string;
    type: 'vacation' | 'sick' | 'personal' | 'business';
    comment: string;
    status: 'pending' | 'approved' | 'rejected';
  }>({
    user_id: '',
    start_date: '',
    end_date: '',
    type: 'vacation',
    comment: '',
    status: 'pending'
  });

  const canCreateForOthers = permissions.includes('action:vacations:create');
  const canUpdateOthers = permissions.includes('action:vacations:update');

  // Функция для преобразования даты в формат YYYY-MM-DD
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (vacation) {
      setFormData({
        user_id: vacation.user_id,
        start_date: formatDateForInput(vacation.start_date),
        end_date: formatDateForInput(vacation.end_date),
        type: vacation.type,
        comment: vacation.comment || '',
        status: vacation.status
      });
    } else {
      // Если передан preselectedUserId, используем его (для пользователей с правами при редактировании)
      // Для обычных пользователей всегда используем их ID
      // Для пользователей с правами без preselectedUserId - пустая строка, чтобы они могли выбрать пользователя
      const defaultUserId = preselectedUserId || (!canCreateForOthers ? (user?.id || '') : '');
      setFormData({
        user_id: defaultUserId,
        start_date: '',
        end_date: '',
        type: 'vacation',
        comment: '',
        status: 'pending'
      });
    }
    console.log('📋 FormData обновлен:', { vacation, canCreateForOthers, userId: user?.id, preselectedUserId });
  }, [vacation, canCreateForOthers, user?.id, preselectedUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Предотвращаем множественные отправки
    if (loading) {
      console.log('⚠️ Сохранение уже выполняется, игнорируем повторную отправку');
      return;
    }
    
    if (!formData.start_date || !formData.end_date) {
      alert('Пожалуйста, укажите даты начала и окончания');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      alert('Дата окончания должна быть больше или равна дате начала');
      return;
    }

    if (canCreateForOthers && !formData.user_id) {
      alert('Пожалуйста, выберите сотрудника');
      return;
    }
    
    // Для обычных пользователей убеждаемся, что user_id установлен
    if (!canCreateForOthers && !formData.user_id && user?.id) {
      formData.user_id = user.id;
    }

    try {
      setLoading(true);
      console.log('📤 Отправка данных отпуска:', formData);
      console.log('📤 preselectedUserId:', preselectedUserId);
      console.log('📤 formData.user_id:', formData.user_id);
      
      // Убеждаемся, что user_id установлен (приоритет у preselectedUserId)
      const dataToSend = {
        ...formData,
        user_id: preselectedUserId || formData.user_id
      };
      
      console.log('📤 Финальные данные для отправки:', dataToSend);
      await onSave(dataToSend);
      // Закрываем модальное окно только после успешного сохранения
      // Не закрываем здесь, так как onSave может обработать это сам
    } catch (error: any) {
      console.error('❌ Ошибка сохранения отпуска:', error);
      // Показываем ошибку пользователю, если она не была обработана в onSave
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      }
      // Не закрываем модальное окно при ошибке, чтобы пользователь мог исправить данные
      throw error; // Пробрасываем ошибку дальше
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkingDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Не воскресенье и не суббота
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  const workingDays = calculateWorkingDays(formData.start_date, formData.end_date);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {vacation ? 'Редактировать отпуск' : 'Добавить отпуск'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Выбор сотрудника (только для пользователей с правами на создание отпусков, если не передан preselectedUserId) */}
          {canCreateForOthers && !preselectedUserId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Сотрудник *
              </label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Выберите сотрудника</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.last_name} {u.first_name} {u.middle_name || ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Показываем имя пользователя, если он предустановлен */}
          {canCreateForOthers && preselectedUserId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Сотрудник
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                {users.find(u => u.id === preselectedUserId) 
                  ? `${users.find(u => u.id === preselectedUserId)?.last_name} ${users.find(u => u.id === preselectedUserId)?.first_name} ${users.find(u => u.id === preselectedUserId)?.middle_name || ''}`.trim()
                  : 'Пользователь не найден'}
              </div>
            </div>
          )}

          {/* Даты */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Дата начала (включительно) *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => {
                  setFormData({ ...formData, start_date: e.target.value });
                  // Если дата окончания меньше даты начала, устанавливаем её равной дате начала
                  if (formData.end_date && new Date(e.target.value) > new Date(formData.end_date)) {
                    setFormData(prev => ({ ...prev, start_date: e.target.value, end_date: e.target.value }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Дата окончания (включительно) *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => {
                  setFormData({ ...formData, end_date: e.target.value });
                  // Если дата начала больше даты окончания, устанавливаем её равной дате окончания
                  if (formData.start_date && new Date(e.target.value) < new Date(formData.start_date)) {
                    setFormData(prev => ({ ...prev, start_date: e.target.value, end_date: e.target.value }));
                  }
                }}
                min={formData.start_date || undefined}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Для однодневного отпуска выберите одинаковые даты
              </p>
            </div>
          </div>

          {/* Количество рабочих дней */}
          {workingDays > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Рабочих дней: <span className="font-medium">{workingDays}</span>
            </div>
          )}

          {/* Тип отпуска */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Тип
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="vacation">Отпуск</option>
              <option value="sick">Больничный</option>
              <option value="personal">Личный</option>
              <option value="business">Командировка</option>
            </select>
          </div>

          {/* Статус (только для пользователей с правами на обновление отпусков при редактировании) */}
          {canUpdateOthers && vacation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Статус
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="pending">На рассмотрении</option>
                <option value="approved">Утверждено</option>
                <option value="rejected">Отклонено</option>
              </select>
            </div>
          )}

          {/* Комментарий */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Комментарий
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="Дополнительная информация..."
            />
          </div>

          {/* Кнопки */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-md"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VacationModal;
