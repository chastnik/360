// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.createTable('assessment_reports', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('participant_id').references('id').inTable('assessment_participants').onDelete('CASCADE');
    table.json('report_data');
    table.json('charts_data');
    table.text('summary');
    table.text('recommendations');
    table.enum('status', ['generating', 'completed', 'error']).defaultTo('generating');
    table.timestamp('generated_at');
    table.text('access_token');
    table.timestamps(true, true);
    
    table.unique(['participant_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('assessment_reports');
}; 