// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.boolean('is_manager').defaultTo(false).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('is_manager');
  });
};