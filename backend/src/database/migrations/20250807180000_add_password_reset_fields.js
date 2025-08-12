// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('reset_token').nullable();
    table.timestamp('reset_token_expiry').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('reset_token');
    table.dropColumn('reset_token_expiry');
  });
};
