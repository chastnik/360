// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.createTable('questions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('category_id').references('id').inTable('categories').onDelete('CASCADE');
    table.text('question_text').notNullable();
    table.text('description');
    table.enum('question_type', ['rating', 'text', 'boolean']).defaultTo('rating');
    table.integer('min_value').defaultTo(1);
    table.integer('max_value').defaultTo(5);
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('questions');
}; 