// © 2025 Бит.Цифра - Стас Чашин
// Миграция для удаления unique constraint из таблицы test_results
// Это позволяет создавать несколько результатов тестирования для одного курса

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Проверяем существование таблицы перед выполнением операции
  const hasTable = await knex.schema.hasTable('test_results');
  if (!hasTable) {
    console.log('Таблица test_results не существует, пропускаем миграцию');
    return;
  }
  
  return knex.raw(`
    ALTER TABLE test_results 
    DROP CONSTRAINT IF EXISTS test_results_growth_plan_id_course_id_unique;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Проверяем существование таблицы перед выполнением операции
  const hasTable = await knex.schema.hasTable('test_results');
  if (!hasTable) {
    console.log('Таблица test_results не существует, пропускаем откат миграции');
    return;
  }
  
  return knex.raw(`
    ALTER TABLE test_results 
    ADD CONSTRAINT test_results_growth_plan_id_course_id_unique 
    UNIQUE (growth_plan_id, course_id);
  `);
};

