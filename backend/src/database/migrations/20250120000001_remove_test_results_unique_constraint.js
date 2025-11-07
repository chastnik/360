// © 2025 Бит.Цифра - Стас Чашин
// Миграция для удаления unique constraint из таблицы test_results
// Это позволяет создавать несколько результатов тестирования для одного курса

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
    ALTER TABLE test_results 
    DROP CONSTRAINT IF EXISTS test_results_growth_plan_id_course_id_unique;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
    ALTER TABLE test_results 
    ADD CONSTRAINT test_results_growth_plan_id_course_id_unique 
    UNIQUE (growth_plan_id, course_id);
  `);
};

