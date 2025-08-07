exports.up = function(knex) {
  return knex.schema.createTable('departments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').unique().notNullable();
    table.string('description');
    table.string('code').unique(); // Код отдела для удобства
    table.uuid('head_id').references('id').inTable('users').onDelete('SET NULL'); // Руководитель отдела
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('departments');
};