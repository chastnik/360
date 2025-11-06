// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import mattermostService from '../services/mattermost';

const router = Router();

// Получить все доступные оценки для пользователя
router.get('/', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Приводим userId к строке для корректного сравнения
    const userIdStr = String(userId);

    // Получить все активные циклы, где пользователь является респондентом
    const assessments = await knex('assessment_respondents')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .where('assessment_respondents.respondent_user_id', userIdStr)
      .where('assessment_cycles.status', 'active')
      .select(
        'assessment_respondents.id as respondent_id',
        'assessment_cycles.name as cycle_title',
        'assessment_cycles.description as cycle_description',
        'assessment_cycles.end_date',
        'users.first_name as participant_first_name',
        'users.last_name as participant_last_name',
        'assessment_respondents.status',
        'assessment_respondents.started_at',
        'assessment_respondents.completed_at'
      )
      .orderBy('assessment_cycles.start_date', 'desc');

    res.json({
      success: true,
      data: assessments
    });
  } catch (error) {
    console.error('Ошибка получения оценок:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Alias: /available — для совместимости с фронтендом
router.get('/available', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Приводим userId к строке для корректного сравнения
    const userIdStr = String(userId);

    const rows = await knex('assessment_respondents')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .where('assessment_respondents.respondent_user_id', userIdStr)
      .where('assessment_cycles.status', 'active')
      .select(
        'assessment_respondents.id as id',
        'assessment_participants.id as participant_id',
        knex.raw("concat(users.first_name, ' ', users.last_name) as participant_name"),
        'assessment_cycles.name as cycle_name',
        'assessment_cycles.description as cycle_description',
        'assessment_cycles.end_date as end_date',
        'assessment_respondents.status as status',
        'assessment_respondents.completed_at as completed_at'
      )
      .orderBy('assessment_cycles.start_date', 'desc');

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Ошибка получения доступных оценок:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Начать оценку
router.post('/:respondentId/start', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { respondentId } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Приводим userId к строке для корректного сравнения
    const userIdStr = String(userId);

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .where('id', respondentId)
      .where('respondent_user_id', userIdStr)
      .first();

    if (!respondent) {
      res.status(404).json({ error: 'Оценка не найдена' });
      return;
    }

    // Обновить статус на "in_progress"
    await knex('assessment_respondents')
      .where('id', respondentId)
      .update({
        status: 'in_progress',
        started_at: knex.fn.now()
      });

    res.json({ message: 'Оценка начата' });
  } catch (error) {
    console.error('Ошибка начала оценки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить вопросы для оценки
router.get('/:respondentId/questions', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { respondentId } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Приводим userId к строке для корректного сравнения
    const userIdStr = String(userId);

    console.log(`[GET /assessments/${respondentId}/questions] userId: ${userIdStr}, respondentId: ${respondentId}`);

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .where('id', respondentId)
      .where('respondent_user_id', userIdStr)
      .first();

    if (!respondent) {
      console.log(`[GET /assessments/${respondentId}/questions] Респондент не найден для userId: ${userIdStr}`);
      res.status(404).json({ error: 'Оценка не найдена' });
      return;
    }

    console.log(`[GET /assessments/${respondentId}/questions] Респондент найден, загружаем вопросы...`);

    // Получить все вопросы с категориями
    console.log(`[GET /assessments/${respondentId}/questions] Загружаем вопросы из БД...`);
    const questions = await knex('questions')
      .join('categories', 'questions.category_id', 'categories.id')
      .where('questions.is_active', true)
      .select(
        'questions.id',
        'questions.question_text as text',
        'questions.category_id',
        'questions.sort_order as order',
        'categories.name as category_name',
        'categories.color as category_color'
      )
      .orderBy('categories.id', 'asc')
      .orderBy('questions.sort_order', 'asc');
    
    console.log(`[GET /assessments/${respondentId}/questions] Загружено ${questions.length} вопросов`);

    // Получить уже данные ответы
    console.log(`[GET /assessments/${respondentId}/questions] Загружаем существующие ответы...`);
    const existingResponses = await knex('assessment_responses')
      .where('respondent_id', respondentId)
      .select('question_id', 'rating_value', 'comment');
    
    console.log(`[GET /assessments/${respondentId}/questions] Загружено ${existingResponses.length} ответов`);

    // Добавить существующие ответы к вопросам
    const questionsWithAnswers = questions.map(question => {
      const existingResponse = existingResponses.find(r => r.question_id === question.id);
      return {
        ...question,
        response: existingResponse?.rating_value || null,
        order: question.order || 0
      };
    });

    console.log(`[GET /assessments/${respondentId}/questions] Возвращаем ${questionsWithAnswers.length} вопросов`);
    res.json(questionsWithAnswers);
  } catch (error) {
    console.error('Ошибка получения вопросов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Сохранить ответ на вопрос
router.post('/:respondentId/responses', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { respondentId } = req.params;
    
    console.log(`[POST /assessments/${respondentId}/responses] Получен запрос:`, {
      body: req.body,
      questionId: req.body?.questionId,
      question_id: req.body?.question_id,
      score: req.body?.score
    });
    
    // Пробуем получить questionId из разных возможных полей
    const questionId = req.body?.question_id || req.body?.questionId;
    const score = req.body?.score;
    const comment = req.body?.comment;
    
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Проверяем наличие обязательных полей
    if (!questionId) {
      console.log(`[POST /assessments/${respondentId}/responses] questionId не указан. Body:`, JSON.stringify(req.body));
      res.status(400).json({ error: 'ID вопроса не указан' });
      return;
    }

    if (score === undefined || score === null) {
      console.log(`[POST /assessments/${respondentId}/responses] score не указан`);
      res.status(400).json({ error: 'Оценка не указана' });
      return;
    }

    // Приводим userId к строке для корректного сравнения
    const userIdStr = String(userId);
    const questionIdStr = String(questionId);

    console.log(`[POST /assessments/${respondentId}/responses] Сохраняем ответ: questionId=${questionIdStr}, score=${score}, questionId type=${typeof questionId}`);

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .where('id', respondentId)
      .where('respondent_user_id', userIdStr)
      .first();

    if (!respondent) {
      console.log(`[POST /assessments/${respondentId}/responses] Респондент не найден для userId: ${userIdStr}`);
      res.status(404).json({ error: 'Оценка не найдена' });
      return;
    }

    // Проверить, что вопрос существует
    const question = await knex('questions')
      .where('id', questionIdStr)
      .where('is_active', true)
      .first();

    if (!question) {
      console.log(`[POST /assessments/${respondentId}/responses] Вопрос не найден: ${questionId}`);
      res.status(404).json({ error: 'Вопрос не найден' });
      return;
    }

    // Проверить валидность оценки
    if (score < 1 || score > 5) {
      console.log(`[POST /assessments/${respondentId}/responses] Неверная оценка: ${score}`);
      res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
      return;
    }

    // Сохранить или обновить ответ
    try {
      await knex('assessment_responses')
        .insert({
          respondent_id: respondentId,
          question_id: questionIdStr,
          rating_value: score,
          comment: comment || null
        })
        .onConflict(['respondent_id', 'question_id'])
        .merge({
          rating_value: score,
          comment: comment || null,
          updated_at: knex.fn.now()
        });

      console.log(`[POST /assessments/${respondentId}/responses] Ответ успешно сохранен`);
      res.json({ message: 'Ответ сохранен' });
    } catch (dbError: any) {
      console.error(`[POST /assessments/${respondentId}/responses] Ошибка БД при сохранении:`, dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Ошибка сохранения ответа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Завершить оценку
router.post('/:respondentId/complete', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { respondentId } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Приводим userId к строке для корректного сравнения
    const userIdStr = String(userId);

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .where('id', respondentId)
      .where('respondent_user_id', userIdStr)
      .first();

    if (!respondent) {
      res.status(404).json({ error: 'Оценка не найдена' });
      return;
    }

    // Получить общее количество вопросов
    const totalQuestions = await knex('questions')
      .where('is_active', true)
      .count('id as count')
      .first();

    // Получить количество отвеченных вопросов
    const answeredQuestions = await knex('assessment_responses')
      .where('respondent_id', respondentId)
      .count('id as count')
      .first();

    const totalCount = Number(totalQuestions?.count || 0);
    const answeredCount = Number(answeredQuestions?.count || 0);

    // Проверить, что все вопросы отвечены
    if (answeredCount < totalCount) {
      res.status(400).json({ 
        error: 'Необходимо ответить на все вопросы перед завершением',
        progress: {
          answered: answeredCount,
          total: totalCount
        }
      });
      return;
    }

    // Завершить оценку
    await knex('assessment_respondents')
      .where('id', respondentId)
      .update({
        status: 'completed',
        completed_at: knex.fn.now()
      });

    // Проверить, завершили ли все респонденты оценку для этого участника
    const participantInfo = await knex('assessment_respondents')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .where('assessment_respondents.id', respondentId)
      .select(
        'assessment_participants.id as participant_id',
        'assessment_cycles.name as cycle_name',
        'users.mattermost_username as participant_username',
        'users.first_name as participant_first_name',
        'users.last_name as participant_last_name'
      )
      .first();

    if (participantInfo) {
      // Подсчитать количество завершенных и общее количество респондентов для участника
      const respondentStats = await knex('assessment_respondents')
        .where('participant_id', participantInfo.participant_id)
        .select(
          knex.raw('COUNT(*) as total'),
          knex.raw('COUNT(CASE WHEN status = ? THEN 1 END) as completed', ['completed'])
        )
        .first();

      // Если все респонденты завершили оценку, отправить уведомление участнику
      if (respondentStats && Number(respondentStats.completed) === Number(respondentStats.total)) {
        try {
          if (participantInfo.participant_username) {
            await mattermostService.notifyAssessmentComplete(
              participantInfo.participant_username,
              participantInfo.cycle_name,
              String(participantInfo.participant_id)
            );
            console.log(`Уведомление о завершении оценки отправлено участнику ${participantInfo.participant_username}`);
          }
        } catch (error) {
          console.error('Ошибка отправки уведомления о завершении оценки:', error);
        }
      }
    }

    res.json({ message: 'Оценка завершена' });
  } catch (error) {
    console.error('Ошибка завершения оценки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить прогресс оценки
router.get('/:respondentId/progress', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { respondentId } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Приводим userId к строке для корректного сравнения
    const userIdStr = String(userId);

    console.log(`[GET /assessments/${respondentId}/progress] userId: ${userIdStr}, respondentId: ${respondentId}`);

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .where('assessment_respondents.id', respondentId)
      .where('assessment_respondents.respondent_user_id', userIdStr)
      .select(
        'assessment_cycles.name as cycle_name',
        'assessment_cycles.description as cycle_description',
        'assessment_cycles.end_date as end_date',
        knex.raw("concat(users.first_name, ' ', users.last_name) as participant_name"),
        'assessment_respondents.status',
        'assessment_respondents.started_at',
        'assessment_respondents.completed_at'
      )
      .first();

    if (!respondent) {
      console.log(`[GET /assessments/${respondentId}/progress] Респондент не найден для userId: ${userIdStr}`);
      res.status(404).json({ error: 'Оценка не найдена' });
      return;
    }

    console.log(`[GET /assessments/${respondentId}/progress] Респондент найден, загружаем прогресс...`);

    // Получить общее количество вопросов
    console.log(`[GET /assessments/${respondentId}/progress] Подсчитываем общее количество вопросов...`);
    const totalQuestions = await knex('questions')
      .where('is_active', true)
      .count('id as count')
      .first();
    console.log(`[GET /assessments/${respondentId}/progress] Всего вопросов: ${totalQuestions?.count || 0}`);

    // Получить количество отвеченных вопросов
    console.log(`[GET /assessments/${respondentId}/progress] Подсчитываем отвеченные вопросы...`);
    const answeredQuestions = await knex('assessment_responses')
      .where('respondent_id', respondentId)
      .count('id as count')
      .first();
    console.log(`[GET /assessments/${respondentId}/progress] Отвечено вопросов: ${answeredQuestions?.count || 0}`);

    // Получить прогресс по категориям - используем упрощенный подход
    console.log(`[GET /assessments/${respondentId}/progress] Загружаем категории с вопросами...`);
    // Сначала получаем категории с количеством вопросов
    const categoriesWithCounts = await knex('categories')
      .select(
        'categories.id',
        'categories.name',
        'categories.color',
        knex.raw('COUNT(DISTINCT questions.id) as total_questions')
      )
      .join('questions', 'categories.id', 'questions.category_id')
      .where('questions.is_active', true)
      .groupBy('categories.id', 'categories.name', 'categories.color')
      .orderBy('categories.id');
    console.log(`[GET /assessments/${respondentId}/progress] Загружено ${categoriesWithCounts.length} категорий`);

    // Получаем количество отвеченных вопросов по категориям
    console.log(`[GET /assessments/${respondentId}/progress] Подсчитываем отвеченные вопросы по категориям...`);
    const answeredByCategory = await knex('assessment_responses')
      .join('questions', 'assessment_responses.question_id', 'questions.id')
      .join('categories', 'questions.category_id', 'categories.id')
      .where('assessment_responses.respondent_id', respondentId)
      .where('questions.is_active', true)
      .groupBy('categories.id')
      .select(
        'categories.id',
        knex.raw('COUNT(DISTINCT assessment_responses.id) as answered_questions')
      );
    console.log(`[GET /assessments/${respondentId}/progress] Найдено ${answeredByCategory.length} категорий с ответами`);

    // Создаем мапу для быстрого доступа к отвеченным вопросам
    const answeredMap = new Map();
    answeredByCategory.forEach((row: any) => {
      answeredMap.set(row.id, Number(row.answered_questions || 0));
    });

    // Формируем итоговый массив категорий с прогрессом
    const categoryProgress = categoriesWithCounts.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      total_questions: Number(cat.total_questions || 0),
      answered_questions: answeredMap.get(cat.id) || 0
    }));
    console.log(`[GET /assessments/${respondentId}/progress] Сформирован прогресс для ${categoryProgress.length} категорий`);
    
    const totalCount = Number(totalQuestions?.count || 0);
    const answeredCount = Number(answeredQuestions?.count || 0);
    
    const progressPercentage = totalCount > 0 
      ? Math.round((answeredCount / totalCount) * 100)
      : 0;

    const responseData = {
      respondent: {
        id: respondentId,
        participant_name: respondent.participant_name,
        cycle_name: respondent.cycle_name,
        cycle_description: respondent.cycle_description,
        end_date: respondent.end_date,
        status: respondent.status
      },
      progress: {
        totalQuestions: totalCount,
        answeredQuestions: answeredCount,
        percentage: progressPercentage,
        categories: categoryProgress.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          total_questions: Number(cat.total_questions || 0),
          answered_questions: Number(cat.answered_questions || 0)
        }))
      }
    };

    console.log(`[GET /assessments/${respondentId}/progress] Возвращаем прогресс: ${answeredCount}/${totalCount} (${progressPercentage}%)`);
    res.json(responseData);
  } catch (error) {
    console.error('Ошибка получения прогресса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 