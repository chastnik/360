// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import knex from '../database/connection';

/**
 * Рассчитывает плановую дату завершения ПИР на основе:
 * - даты старта
 * - нагрузки в % от рабочего времени
 * - общего количества часов курсов
 * - рабочего календаря (рабочие дни + праздники)
 * - отпусков пользователя
 */
export async function calculateEndDate(
  startDate: Date,
  studyLoadPercent: number,
  totalCourseHours: number,
  userId?: string
): Promise<Date | null> {
  try {
    // Получаем рабочее расписание
    const workSchedule = await knex('work_schedule')
      .select('*')
      .orderBy('day_of_week');
    
    if (workSchedule.length === 0) {
      console.warn('⚠️ Рабочее расписание не настроено, используется стандартное (пн-пт, 8 часов)');
    }
    
    // Получаем все праздники
    const holidays = await knex('holidays')
      .select('date')
      .where('date', '>=', startDate.toISOString().split('T')[0]);
    
    const holidayDates = new Set(holidays.map((h: any) => h.date.toISOString().split('T')[0]));
    
    // Получаем отпуска пользователя (утвержденные)
    let userVacationDates = new Set<string>();
    if (userId) {
      const userVacations = await knex('vacations')
        .select('start_date', 'end_date')
        .where('user_id', userId)
        .where('status', 'approved')
        .where('end_date', '>=', startDate.toISOString().split('T')[0]);
      
      // Добавляем все даты из диапазона отпусков
      for (const vacation of userVacations) {
        const start = new Date(vacation.start_date);
        const end = new Date(vacation.end_date);
        const currentDate = new Date(start);
        
        while (currentDate <= end) {
          const dateStr = currentDate.toISOString().split('T')[0];
          if (dateStr >= startDate.toISOString().split('T')[0]) {
            userVacationDates.add(dateStr);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }
    
    // Создаем мапу рабочих дней по номеру дня недели (1=пн, 7=вс)
    const scheduleMap = new Map<number, { is_workday: boolean; work_hours: number }>();
    for (const day of workSchedule) {
      scheduleMap.set(day.day_of_week, {
        is_workday: day.is_workday,
        work_hours: day.work_hours || 8
      });
    }
    
    // Если расписание пустое, используем стандартное (пн-пт, 8 часов)
    if (scheduleMap.size === 0) {
      for (let i = 1; i <= 5; i++) {
        scheduleMap.set(i, { is_workday: true, work_hours: 8 });
      }
      for (let i = 6; i <= 7; i++) {
        scheduleMap.set(i, { is_workday: false, work_hours: 0 });
      }
    }
    
    // Идем по дням от даты старта, считая часы с учетом нагрузки и календаря
    let currentDate = new Date(startDate);
    let hoursAccumulated = 0; // Накопленные часы обучения
    const maxDays = 365 * 2; // Максимальный срок - 2 года
    let daysChecked = 0;
    
    while (hoursAccumulated < totalCourseHours && daysChecked < maxDays) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay(); // Преобразуем 0=вс в 7
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Проверяем, является ли день рабочим
      const schedule = scheduleMap.get(dayOfWeek);
      const isWorkday = schedule?.is_workday && !holidayDates.has(dateStr) && !userVacationDates.has(dateStr);
      
      if (isWorkday) {
        // Получаем количество рабочих часов в этот день
        const workHoursInDay = schedule?.work_hours || 8;
        // Рассчитываем часы обучения в этот день с учетом нагрузки
        const studyHoursInDay = (studyLoadPercent / 100) * workHoursInDay;
        // Добавляем часы к накопленным
        hoursAccumulated += studyHoursInDay;
      }
      
      // Переходим к следующему дню
      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
    }
    
    if (daysChecked >= maxDays) {
      console.warn('⚠️ Превышен максимальный срок расчета (2 года)');
      return null;
    }
    
    return currentDate;
  } catch (error) {
    console.error('❌ Ошибка расчета даты завершения:', error);
    return null;
  }
}

export default { calculateEndDate };

