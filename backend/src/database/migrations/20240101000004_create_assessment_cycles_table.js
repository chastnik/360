// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.createTable('assessment_cycles', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.uuid('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.enum('status', ['draft', 'active', 'completed', 'cancelled']).defaultTo('draft');
    table.integer('respondent_count').defaultTo(5);
    table.boolean('allow_self_assessment').defaultTo(true);
    table.boolean('include_manager_assessment').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('assessment_cycles');
}; 