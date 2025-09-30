// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.createTable('vacations', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.integer('days_count').notNullable();
    table.enum('type', ['vacation', 'sick', 'personal', 'business']).defaultTo('vacation');
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.text('comment');
    table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');
    table.timestamps(true, true);
    
    // Индексы для быстрого поиска
    table.index(['user_id']);
    table.index(['start_date', 'end_date']);
    table.index(['status']);
    table.index(['type']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('vacations');
};
