// © 2025 Бит.Цифра - Стас Чашин

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  return knex.schema
    // Таблица рабочего расписания
    .createTable('work_schedule', function(table) {
      table.increments('id').primary();
      table.integer('day_of_week').notNullable().comment('День недели: 1=Понедельник, 7=Воскресенье');
      table.boolean('is_workday').defaultTo(true).comment('Является ли рабочим днем');
      table.integer('work_hours').unsigned().defaultTo(8).comment('Количество рабочих часов в день');
      table.time('start_time').defaultTo('09:00:00').comment('Время начала работы');
      table.time('end_time').defaultTo('18:00:00').comment('Время окончания работы');
      table.timestamps(true, true);
      table.unique(['day_of_week']);
    })
    
    // Таблица праздников и нерабочих дней
    .createTable('holidays', function(table) {
      table.increments('id').primary();
      table.date('date').notNullable().comment('Дата праздника/нерабочего дня');
      table.string('name', 200).notNullable().comment('Название праздника');
      table.text('description').nullable().comment('Описание праздника');
      table.boolean('is_national').defaultTo(true).comment('Является ли государственным праздником');
      table.timestamps(true, true);
      table.unique(['date']);
      table.index('date');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('holidays')
    .dropTableIfExists('work_schedule');
};

