/**
 * Миграция для пересчета количества дней отпуска с рабочих дней на календарные дни
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Получаем все отпуска
  const vacations = await knex('vacations').select('id', 'start_date', 'end_date');
  
  console.log(`Найдено ${vacations.length} отпусков для пересчета`);
  
  // Пересчитываем каждый отпуск
  for (const vacation of vacations) {
    if (!vacation.start_date || !vacation.end_date) {
      console.log(`Пропущен отпуск ${vacation.id}: отсутствуют даты`);
      continue;
    }
    
    const startDate = new Date(vacation.start_date);
    const endDate = new Date(vacation.end_date);
    
    // Вычисляем календарные дни
    const timeDiff = endDate.getTime() - startDate.getTime();
    const calendarDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    // Обновляем запись
    await knex('vacations')
      .where('id', vacation.id)
      .update({ days_count: calendarDays });
    
    console.log(`Обновлен отпуск ${vacation.id}: ${calendarDays} календарных дней`);
  }
  
  console.log('Пересчет завершен');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Откат миграции: пересчитываем обратно на рабочие дни
  const vacations = await knex('vacations').select('id', 'start_date', 'end_date');
  
  console.log(`Найдено ${vacations.length} отпусков для отката`);
  
  for (const vacation of vacations) {
    if (!vacation.start_date || !vacation.end_date) {
      continue;
    }
    
    const startDate = new Date(vacation.start_date);
    const endDate = new Date(vacation.end_date);
    
    // Вычисляем рабочие дни (исключая выходные)
    let workingDays = 0;
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Не воскресенье и не суббота
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await knex('vacations')
      .where('id', vacation.id)
      .update({ days_count: workingDays });
  }
  
  console.log('Откат завершен');
};

