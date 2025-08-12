// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.createTable('assessment_respondents', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('participant_id').references('id').inTable('assessment_participants').onDelete('CASCADE');
    table.uuid('respondent_user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('respondent_type', ['peer', 'subordinate', 'manager', 'self']).notNullable();
    table.enum('status', ['invited', 'in_progress', 'completed', 'declined']).defaultTo('invited');
    table.timestamp('invitation_sent_at');
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.text('completion_token');
    table.timestamps(true, true);
    
    table.unique(['participant_id', 'respondent_user_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('assessment_respondents');
}; 