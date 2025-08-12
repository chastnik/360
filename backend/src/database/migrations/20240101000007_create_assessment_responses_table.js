// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.createTable('assessment_responses', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('respondent_id').references('id').inTable('assessment_respondents').onDelete('CASCADE');
    table.uuid('question_id').references('id').inTable('questions').onDelete('CASCADE');
    table.integer('rating_value');
    table.text('text_response');
    table.boolean('boolean_response');
    table.text('comment');
    table.timestamps(true, true);
    
    table.unique(['respondent_id', 'question_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('assessment_responses');
}; 