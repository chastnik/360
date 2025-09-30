// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('middle_name');
    table.string('position');
    table.string('department');
    table.uuid('manager_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('mattermost_username');
    table.string('mattermost_user_id');
    table.enum('role', ['admin', 'manager', 'user']).defaultTo('user');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
}; 