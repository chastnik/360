// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.createTable('assessment_participants', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('cycle_id').references('id').inTable('assessment_cycles').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['invited', 'respondents_selected', 'in_progress', 'completed']).defaultTo('invited');
    table.timestamp('invitation_sent_at');
    table.timestamp('respondents_selected_at');
    table.timestamp('completed_at');
    table.timestamps(true, true);
    
    table.unique(['cycle_id', 'user_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('assessment_participants');
}; 