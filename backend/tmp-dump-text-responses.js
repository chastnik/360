// Автор: Стас Чашин @chastnik
// Быстрая проверка: есть ли текстовые ответы по указанному вопросу
// Запуск:
// NODE_ENV=development DB_HOST=... DB_NAME=... DB_USER=... DB_PASSWORD=... DB_PORT=... \
// node backend/tmp-dump-text-responses.js --questionText="Опиши, какие сильные и слабы стороны"

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

(async () => {
  try {
    await knex.raw('select 1');
    const question = await knex('questions')
      .where('question_type', 'text')
      .andWhere('question_text', 'ilike', `%${String(argv.questionText || '')}%`)
      .first('id', 'question_text');
    if (!question) throw new Error('Вопрос не найден');

    const rows = await knex('assessment_responses')
      .join('assessment_respondents', 'assessment_responses.respondent_id', 'assessment_respondents.id')
      .join('users', 'assessment_respondents.respondent_user_id', 'users.id')
      .select('assessment_responses.id', 'assessment_responses.text_response', 'users.first_name', 'users.last_name')
      .where('assessment_responses.question_id', question.id)
      .whereNotNull('assessment_responses.text_response')
      .limit(10);

    const countRow = await knex('assessment_responses')
      .count('* as cnt')
      .where('question_id', question.id)
      .whereNotNull('text_response')
      .first();

    console.log(JSON.stringify({
      questionId: question.id,
      questionText: question.question_text,
      textResponsesTotal: Number(countRow?.cnt || 0),
      sample: rows.map(r => ({ id: r.id, text: r.text_response, respondent: `${r.first_name || ''} ${r.last_name || ''}`.trim() }))
    }, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message || e);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();


