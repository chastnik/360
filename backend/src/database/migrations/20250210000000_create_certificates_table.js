// © 2025 Бит.Цифра - Стас Чашин

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  return knex.schema
    .createTable('certificates', function(table) {
      table.increments('id').primary();
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      // Связь с компетенцией (для ручного ввода)
      table.integer('competence_matrix_id').unsigned().nullable().references('id').inTable('competence_matrix').onDelete('CASCADE');
      // Связь с результатом тестирования (для тестов)
      table.integer('test_result_id').unsigned().nullable().references('id').inTable('test_results').onDelete('CASCADE');
      // Название сертификата
      table.string('name', 500).notNullable();
      // Файл сертификата (BLOB)
      table.binary('file_data').notNullable();
      // MIME тип файла
      table.string('file_mime', 100).notNullable();
      // Оригинальное имя файла
      table.string('file_name', 500).notNullable();
      // Размер файла в байтах
      table.integer('file_size').unsigned().notNullable();
      table.timestamps(true, true);
      
      // Индексы для быстрого поиска
      table.index('user_id');
      table.index('competence_matrix_id');
      table.index('test_result_id');
    })
    .then(() => {
      // Проверка: должен быть указан либо competence_matrix_id, либо test_result_id
      // Используем raw SQL, так как Knex не поддерживает constraintName в check()
      return knex.raw(`
        ALTER TABLE certificates 
        ADD CONSTRAINT certificates_has_reference_check 
        CHECK (competence_matrix_id IS NOT NULL OR test_result_id IS NOT NULL);
      `);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('certificates');
};

