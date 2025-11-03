// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface WorkScheduleDay {
  id?: number;
  day_of_week: number;
  is_workday: boolean;
  work_hours: number;
  start_time: string;
  end_time: string;
}

interface Holiday {
  id?: number;
  date: string;
  name: string;
  description?: string;
  is_national: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 7, label: 'Воскресенье' },
];

const AdminCalendar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'holidays'>('schedule');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Рабочее расписание
  const [schedule, setSchedule] = useState<WorkScheduleDay[]>([]);

  // Праздники
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = useState<Holiday>({
    date: '',
    name: '',
    description: '',
    is_national: true,
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [scheduleRes, holidaysRes] = await Promise.all([
        api.get('/calendar/work-schedule'),
        api.get(`/calendar/holidays?year=${selectedYear}`),
      ]);

      if (scheduleRes.data.success) {
        // Если расписание пустое, создаем стандартное
        if (scheduleRes.data.data.length === 0) {
          const defaultSchedule: WorkScheduleDay[] = DAYS_OF_WEEK.map(day => ({
            day_of_week: day.value,
            is_workday: day.value <= 5,
            work_hours: day.value <= 5 ? 8 : 0,
            start_time: '09:00:00',
            end_time: '18:00:00',
          }));
          setSchedule(defaultSchedule);
        } else {
          setSchedule(scheduleRes.data.data);
        }
      }

      if (holidaysRes.data.success) {
        setHolidays(holidaysRes.data.data || []);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки данных календаря:', error);
      setError(error.response?.data?.error || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await api.put('/calendar/work-schedule', { schedule });
      
      if (response.data.success) {
        setSuccessMessage('Рабочее расписание сохранено');
        setSchedule(response.data.data);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.data.error || 'Не удалось сохранить расписание');
      }
    } catch (error: any) {
      console.error('Ошибка сохранения расписания:', error);
      setError(error.response?.data?.error || 'Не удалось сохранить расписание');
    } finally {
      setSaving(false);
    }
  };

  const updateScheduleDay = (dayOfWeek: number, field: keyof WorkScheduleDay, value: any) => {
    setSchedule(prev => prev.map(day => 
      day.day_of_week === dayOfWeek 
        ? { ...day, [field]: value }
        : day
    ));
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      
      const url = editingHoliday && editingHoliday.id 
        ? `/calendar/holidays/${editingHoliday.id}`
        : '/calendar/holidays';
      
      const method = editingHoliday && editingHoliday.id ? 'put' : 'post';
      
      const response = await api[method](url, holidayForm);
      
      if (response.data.success) {
        setSuccessMessage(editingHoliday ? 'Праздник обновлен' : 'Праздник создан');
        setShowHolidayForm(false);
        setEditingHoliday(null);
        resetHolidayForm();
        loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.data.error || 'Не удалось сохранить праздник');
      }
    } catch (error: any) {
      console.error('Ошибка сохранения праздника:', error);
      setError(error.response?.data?.error || 'Не удалось сохранить праздник');
    } finally {
      setSaving(false);
    }
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      date: holiday.date,
      name: holiday.name,
      description: holiday.description || '',
      is_national: holiday.is_national,
    });
    setShowHolidayForm(true);
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот праздник?')) {
      return;
    }

    try {
      setSaving(true);
      await api.delete(`/calendar/holidays/${id}`);
      setSuccessMessage('Праздник удален');
      loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Ошибка удаления праздника:', error);
      setError(error.response?.data?.error || 'Не удалось удалить праздник');
    } finally {
      setSaving(false);
    }
  };

  const resetHolidayForm = () => {
    setHolidayForm({
      date: '',
      name: '',
      description: '',
      is_national: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Календарь</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Управление рабочим расписанием и нерабочими днями
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex">
            <div className="text-sm text-green-800 dark:text-green-200">{successMessage}</div>
          </div>
        </div>
      )}

      {/* Вкладки */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`${
              activeTab === 'schedule'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Рабочее расписание
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`${
              activeTab === 'holidays'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Праздники и нерабочие дни
          </button>
        </nav>
      </div>

      {/* Рабочее расписание */}
      {activeTab === 'schedule' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Настройка рабочего расписания
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Укажите рабочие дни недели и количество рабочих часов
            </p>
          </div>

          <div className="space-y-4">
            {schedule.map((day) => {
              const dayInfo = DAYS_OF_WEEK.find(d => d.value === day.day_of_week);
              return (
                <div
                  key={day.day_of_week}
                  className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {dayInfo?.label}
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={day.is_workday}
                      onChange={(e) => updateScheduleDay(day.day_of_week, 'is_workday', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="text-sm text-gray-700 dark:text-gray-300">Рабочий день</label>
                  </div>

                  {day.is_workday && (
                    <>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-700 dark:text-gray-300">Часов:</label>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={day.work_hours}
                          onChange={(e) => updateScheduleDay(day.day_of_week, 'work_hours', parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-700 dark:text-gray-300">С:</label>
                        <input
                          type="time"
                          value={day.start_time}
                          onChange={(e) => updateScheduleDay(day.day_of_week, 'start_time', e.target.value)}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-700 dark:text-gray-300">До:</label>
                        <input
                          type="time"
                          value={day.end_time}
                          onChange={(e) => updateScheduleDay(day.day_of_week, 'end_time', e.target.value)}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSchedule}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Сохранение...' : 'Сохранить расписание'}
            </button>
          </div>
        </div>
      )}

      {/* Праздники */}
      {activeTab === 'holidays' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Год:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                resetHolidayForm();
                setEditingHoliday(null);
                setShowHolidayForm(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Добавить праздник
            </button>
          </div>

          {/* Форма создания/редактирования праздника */}
          {showHolidayForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingHoliday ? 'Редактировать праздник' : 'Добавить праздник'}
              </h3>
              <form onSubmit={handleCreateHoliday} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Дата
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Название
                  </label>
                  <input
                    type="text"
                    required
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={holidayForm.is_national}
                    onChange={(e) => setHolidayForm({ ...holidayForm, is_national: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Государственный праздник
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHolidayForm(false);
                      setEditingHoliday(null);
                      resetHolidayForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Сохранение...' : editingHoliday ? 'Обновить' : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Список праздников */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Праздники {selectedYear} года
              </h3>
              {holidays.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Праздники не найдены
                </div>
              ) : (
                <div className="space-y-2">
                  {holidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(holiday.date).toLocaleDateString('ru-RU')}
                          </span>
                          <span className="text-gray-900 dark:text-white">{holiday.name}</span>
                          {holiday.is_national && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                              Гос. праздник
                            </span>
                          )}
                        </div>
                        {holiday.description && (
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {holiday.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditHoliday(holiday)}
                          className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => holiday.id && handleDeleteHoliday(holiday.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;

