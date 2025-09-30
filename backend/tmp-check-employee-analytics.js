// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
// Проверка: выборка ответов для конкретного сотрудника по последнему завершенному циклу

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || '360',
    user: process.env.DB_USER || '360',
    password: process.env.DB_PASSWORD || ''
  }
});

(async () => {
  try {
    const firstName = process.argv[2] || 'Даниил';
    const lastName = process.argv[3] || 'Бутенко';

    const user = await knex('users')
      .whereRaw('lower(first_name) = lower(?)', [firstName])
      .andWhereRaw('lower(last_name) = lower(?)', [lastName])
      .first('id', 'first_name', 'last_name');
    if (!user) throw new Error('Пользователь не найден');

    // Последний завершенный цикл
    const participant = await knex('assessment_participants')
      .where('assessment_participants.user_id', user.id)
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .where('assessment_cycles.status', 'completed')
      .select('assessment_participants.id as participant_id', 'assessment_cycles.name as cycle_name')
      .orderBy([{ column: 'assessment_cycles.end_date', order: 'desc' }, { column: 'assessment_participants.created_at', order: 'desc' }])
      .first();

    if (!participant) throw new Error('Участник в завершенных циклах не найден');

    const rows = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('users as ru', 'assessment_respondents.respondent_user_id', 'ru.id')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .select(
        'questions.question_text',
        'questions.question_type',
        'assessment_responses.rating_value',
        'assessment_responses.text_response',
        'assessment_responses.boolean_response',
        'ru.first_name', 'ru.last_name'
      )
      .where('assessment_respondents.participant_id', participant.participant_id)
      .andWhere('questions.question_type', 'text')
      .limit(10);

    console.log(JSON.stringify({ user, participant, sample: rows }, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message || e);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();


