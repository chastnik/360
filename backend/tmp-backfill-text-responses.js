// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
// Назначение: дозаполнить текстовые ответы на новый текстовый вопрос
// Использование:
//   NODE_ENV=development DB_HOST=... DB_NAME=... DB_USER=... DB_PASSWORD=... DB_PORT=... \
//   node backend/tmp-backfill-text-responses.js [--questionId=<uuid>] [--cycleId=<uuid>]

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const argv = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v ?? true;
  return acc;
}, {});

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

async function selectTargetQuestionId() {
  if (argv.questionId) return String(argv.questionId);
  if (argv.questionText) {
    const row = await knex('questions')
      .where('question_type', 'text')
      .andWhere('question_text', 'ilike', `%${String(argv.questionText)}%`)
      .first('id');
    if (!row) throw new Error('Текстовый вопрос по шаблону не найден');
    return row.id;
  }
  // Берём самый новый текстовый вопрос
  const row = await knex('questions')
    .where({ question_type: 'text' })
    .orderBy('created_at', 'desc')
    .first('id');
  if (!row) throw new Error('Не найден ни один текстовый вопрос');
  return row.id;
}

function randomText() {
  const strengths = [
    'сильные аналитические способности',
    'ответственность и надёжность',
    'инициативность и проактивность',
    'умение работать в команде',
    'высокая результативность',
  ];
  const improvements = [
    'улучшить коммуникацию с коллегами',
    'больше делегировать задачи',
    'сфокусироваться на приоритизации',
    'укрепить навыки планирования',
    'развивать презентационные навыки',
  ];
  const impact = [
    'это помогает команде двигаться быстрее',
    'это заметно повышает качество результата',
    'это позитивно влияет на атмосферу в коллективе',
    'это ускоряет принятие решений',
    'это поддерживает стабильность процессов',
  ];

  const s1 = strengths[Math.floor(Math.random() * strengths.length)];
  const s2 = strengths[Math.floor(Math.random() * strengths.length)];
  const w1 = improvements[Math.floor(Math.random() * improvements.length)];
  const eff = impact[Math.floor(Math.random() * impact.length)];

  const sentences = [
    `У сотрудника ${s1}, а также ${s2}.`,
    `В работе он демонстрирует вовлечённость и устойчивость к стрессу, ${eff}.`,
    `Зоной роста можно считать необходимость ${w1}.`,
    `Рекомендую регулярно собирать обратную связь и фиксировать результаты развития.`,
  ];

  // 3–4 предложения
  const n = 3 + Math.floor(Math.random() * 2);
  return sentences.slice(0, n).join(' ');
}

(async () => {
  try {
    await knex.raw('select 1');
    const questionId = await selectTargetQuestionId();

    // Ограничиваемся завершенными циклами (или конкретным)
    let cyclesQuery = knex('assessment_cycles').select('id').where('status', 'completed');
    if (argv.cycleId) cyclesQuery = cyclesQuery.andWhere('id', String(argv.cycleId));
    const cycles = await cyclesQuery;
    if (cycles.length === 0) {
      console.log('Нет завершенных циклов для обработки');
      return;
    }

    let respondentsProcessed = 0;
    let responsesInserted = 0;
    let responsesUpdated = 0;

    for (const c of cycles) {
      const participants = await knex('assessment_participants')
        .select('id')
        .where({ cycle_id: c.id })
        .andWhere('status', 'completed');

      if (participants.length === 0) continue;

      const respondentRows = await knex('assessment_respondents')
        .select('id')
        .whereIn('participant_id', participants.map(p => p.id))
        .andWhere('status', 'completed');

      for (const r of respondentRows) {
        respondentsProcessed++;
        // Проверяем, нет ли уже ответа
        const exists = await knex('assessment_responses')
          .where({ respondent_id: r.id, question_id: questionId })
          .first('id');
        if (exists) {
          if (argv.overwrite) {
            await knex('assessment_responses')
              .where({ id: exists.id })
              .update({ text_response: randomText() });
            responsesUpdated++;
          }
          continue;
        }

        await knex('assessment_responses')
          .insert({
            respondent_id: r.id,
            question_id: questionId,
            text_response: randomText()
          })
          .onConflict(['respondent_id', 'question_id'])
          .ignore();
        responsesInserted++;
      }
    }

    console.log(JSON.stringify({
      questionId,
      questionText: argv.questionText || null,
      cyclesProcessed: cycles.length,
      respondentsProcessed,
      responsesInserted,
      responsesUpdated,
      overwrite: !!argv.overwrite
    }));
  } catch (e) {
    console.error('ERROR:', e.message || e);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();


