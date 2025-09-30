
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
}

const VacationModal: React.FC<VacationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vacation,
  users
}) => {
  const { user } = useAuth();
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

  const canEdit = user?.role === 'admin' || user?.role === 'hr';

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
      setFormData({
        user_id: canEdit ? '' : (user?.id || ''),
        start_date: '',
        end_date: '',
        type: 'vacation',
        comment: '',
        status: 'pending'
      });
    }
  }, [vacation, canEdit, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.start_date || !formData.end_date) {
      alert('Пожалуйста, укажите даты начала и окончания');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      alert('Дата окончания должна быть больше или равна дате начала');
      return;
    }

    if (canEdit && !formData.user_id) {
      alert('Пожалуйста, выберите сотрудника');
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения отпуска:', error);
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
          {/* Выбор сотрудника (только для админов и HR) */}
          {canEdit && (
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

          {/* Даты */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Дата начала *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Дата окончания *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
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

          {/* Статус (только для админов и HR при редактировании) */}
          {canEdit && vacation && (
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
