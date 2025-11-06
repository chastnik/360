// © 2025 Бит.Цифра - Стас Чашин

/**
 * Миграция для добавления поля source в таблицу competence_matrix
 * source может быть 'training' (получено через обучение) или 'manual' (указано вручную)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Проверяем, существует ли колонка source
  const hasSourceColumn = await knex.schema.hasColumn('competence_matrix', 'source');
  
  if (!hasSourceColumn) {
    // Добавляем колонку source с дефолтным значением 'training' для существующих записей
    await knex.schema.table('competence_matrix', function(table) {
      table.string('source', 20).defaultTo('training').notNullable();
    });
    
    // Устанавливаем значение 'training' для всех существующих записей
    await knex('competence_matrix')
      .whereNull('source')
      .orWhere('source', '')
      .update({ source: 'training' });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Удаляем колонку source
  const hasSourceColumn = await knex.schema.hasColumn('competence_matrix', 'source');
  
  if (hasSourceColumn) {
    await knex.schema.table('competence_matrix', function(table) {
      table.dropColumn('source');
    });
  }
};

