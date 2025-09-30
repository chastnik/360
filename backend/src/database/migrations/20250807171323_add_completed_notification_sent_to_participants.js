// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('assessment_participants', function(table) {
    table.boolean('completed_notification_sent').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('assessment_participants', function(table) {
    table.dropColumn('completed_notification_sent');
  });
};