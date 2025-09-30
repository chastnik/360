// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
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

const SOURCE_CYCLE_NAME = 'Тестовый цикл 2025-08-08';

(async () => {
  try {
    await knex.raw('select 1');

    const sourceCycle = await knex('assessment_cycles')
      .where('name', SOURCE_CYCLE_NAME)
      .first();

    if (!sourceCycle) {
      throw new Error(`Цикл с именем "${SOURCE_CYCLE_NAME}" не найден`);
    }

    const participants = await knex('assessment_participants')
      .where('cycle_id', sourceCycle.id)
      .select('user_id');

    if (!participants || participants.length === 0) {
      throw new Error('У исходного цикла нет участников');
    }

    // Создаем новый цикл с похожим названием
    const suffix = new Date().toISOString().slice(0, 10);
    const [newCycle] = await knex('assessment_cycles')
      .insert({
        name: `${SOURCE_CYCLE_NAME} (повтор ${suffix})`,
        description: `Клон исходного цикла по участникам с рандомными оценками (${suffix})`,
        start_date: knex.fn.now(),
        end_date: knex.fn.now(),
        status: 'completed'
      })
      .returning('*');

    // Создаем участников 1:1 по user_id
    const newParticipants = [];
    for (const { user_id } of participants) {
      const [p] = await knex('assessment_participants')
        .insert({
          cycle_id: newCycle.id,
          user_id,
          status: 'completed',
          invitation_sent_at: knex.fn.now(),
          respondents_selected_at: knex.fn.now(),
          completed_at: knex.fn.now()
        })
        .returning('*');
      newParticipants.push(p);
    }

    const questions = await knex('questions').select('id', 'question_type', 'min_value', 'max_value');

    let respondentsTotal = 0;
    let responsesTotal = 0;

    // Для каждого участника возьмем 5 случайных респондентов (активных, не сам участник)
    for (const participant of newParticipants) {
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
            // Текст сделаем чуть иным, чтобы отличалось
            row.text_response = 'Рандомный тестовый ответ ' + Math.random().toString(36).slice(2, 7);
          }
          await knex('assessment_responses')
            .insert(row)
            .onConflict(['respondent_id', 'question_id'])
            .ignore();
          responsesTotal++;
        }
      }
    }

    console.log(JSON.stringify({
      clonedFrom: SOURCE_CYCLE_NAME,
      newCycleId: newCycle.id,
      participantCount: newParticipants.length,
      respondents: respondentsTotal,
      responses: responsesTotal
    }));
  } catch (e) {
    console.error('ERROR:', e.message || e);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();



