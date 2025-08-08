const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || '360',
    user: process.env.DB_USER || '360',
    password: process.env.DB_PASSWORD || ''
  }
});

(async () => {
  try {
    await knex.raw('select 1');
    const activeUsers = await knex('users')
      .where('is_active', true)
      .select('id')
      .orderByRaw('random()')
      .limit(50);

    if (activeUsers.length < 10) {
      throw new Error('Недостаточно активных пользователей (нужно >= 10)');
    }

    const [cycle] = await knex('assessment_cycles')
      .insert({
        name: 'Тестовый цикл ' + new Date().toISOString().slice(0, 10),
        description: 'Автоматически создан для тестовых данных',
        start_date: knex.fn.now(),
        end_date: knex.fn.now(),
        status: 'completed'
      })
      .returning('*');

    const participants = [];
    for (let i = 0; i < 5; i++) {
      const userId = activeUsers[i].id;
      const [p] = await knex('assessment_participants')
        .insert({
          cycle_id: cycle.id,
          user_id: userId,
          status: 'completed',
          invitation_sent_at: knex.fn.now(),
          respondents_selected_at: knex.fn.now(),
          completed_at: knex.fn.now()
        })
        .returning('*');
      participants.push(p);
    }

    const questions = await knex('questions').select('id', 'question_type', 'min_value', 'max_value');
    let respondentsTotal = 0;
    let responsesTotal = 0;

    for (const participant of participants) {
      const respondentUsers = await knex('users')
        .where('is_active', true)
        .andWhereNot('id', participant.user_id)
        .orderByRaw('random()')
        .limit(5);

      for (const ru of respondentUsers) {
        const [resp] = await knex('assessment_respondents')
          .insert({
            participant_id: participant.id,
            respondent_user_id: ru.id,
            respondent_type: 'peer',
            status: 'completed',
            invitation_sent_at: knex.fn.now(),
            started_at: knex.fn.now(),
            completed_at: knex.fn.now()
          })
          .onConflict(['participant_id', 'respondent_user_id'])
          .merge()
          .returning('*');
        respondentsTotal++;

        for (const q of questions) {
          const row = { respondent_id: resp.id, question_id: q.id };
          if (q.question_type === 'rating') {
            const min = q.min_value ?? 1;
            const max = q.max_value ?? 5;
            row.rating_value = Math.floor(Math.random() * (max - min + 1)) + min;
          } else if (q.question_type === 'boolean') {
            row.boolean_response = Math.random() < 0.5;
          } else {
            row.text_response = 'Тестовый ответ';
          }
          await knex('assessment_responses')
            .insert(row)
            .onConflict(['respondent_id', 'question_id'])
            .ignore();
          responsesTotal++;
        }
      }
    }

    console.log(JSON.stringify({ cycleId: cycle.id, participants: participants.length, respondents: respondentsTotal, responses: responsesTotal }));
  } catch (e) {
    console.error('ERROR:', e.message || e);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();
