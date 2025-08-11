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

    // Получить все активные циклы, где пользователь является респондентом
    const assessments = await knex('assessment_respondents')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .where('assessment_respondents.respondent_user_id', userId)
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

    const rows = await knex('assessment_respondents')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .where('assessment_respondents.respondent_user_id', userId)
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

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .where('id', respondentId)
      .where('respondent_id', userId)
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

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .where('id', respondentId)
      .where('respondent_id', userId)
      .first();

    if (!respondent) {
      res.status(404).json({ error: 'Оценка не найдена' });
      return;
    }

    // Получить все вопросы с категориями
    const questions = await knex('questions')
      .join('categories', 'questions.category_id', 'categories.id')
      .where('questions.is_active', true)
      .select(
        'questions.id',
        'questions.text',
        'questions.category_id',
        'categories.name as category_name',
        'categories.color as category_color'
      )
      .orderBy('categories.id', 'asc')
      .orderBy('questions.order_index', 'asc');

    // Получить уже данные ответы
    const existingResponses = await knex('assessment_responses')
      .where('respondent_id', respondentId)
      .select('question_id', 'score', 'comment');

    // Добавить существующие ответы к вопросам
    const questionsWithAnswers = questions.map(question => {
      const existingResponse = existingResponses.find(r => r.question_id === question.id);
      return {
        ...question,
        existingScore: existingResponse?.score || null,
        existingComment: existingResponse?.comment || null
      };
    });

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
    const { questionId, score, comment } = req.body;
    
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .where('id', respondentId)
      .where('respondent_id', userId)
      .first();

    if (!respondent) {
      res.status(404).json({ error: 'Оценка не найдена' });
      return;
    }

    // Проверить, что вопрос существует
    const question = await knex('questions')
      .where('id', questionId)
      .where('is_active', true)
      .first();

    if (!question) {
      res.status(404).json({ error: 'Вопрос не найден' });
      return;
    }

    // Проверить валидность оценки
    if (score < 1 || score > 5) {
      res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
      return;
    }

    // Сохранить или обновить ответ
    await knex('assessment_responses')
      .insert({
        respondent_id: respondentId,
        question_id: questionId,
        score: score,
        comment: comment || null
      })
      .onConflict(['respondent_id', 'question_id'])
      .merge({
        score: score,
        comment: comment || null,
        updated_at: knex.fn.now()
      });

    res.json({ message: 'Ответ сохранен' });
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

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .where('id', respondentId)
      .where('respondent_id', userId)
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
        'assessment_cycles.title as cycle_title',
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
              participantInfo.cycle_title,
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

    // Проверить, что респондент принадлежит пользователю
    const respondent = await knex('assessment_respondents')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .where('assessment_respondents.id', respondentId)
      .where('assessment_respondents.respondent_id', userId)
      .select(
        'assessment_cycles.title as cycle_title',
        'users.first_name as participant_first_name',
        'users.last_name as participant_last_name',
        'assessment_respondents.status',
        'assessment_respondents.started_at',
        'assessment_respondents.completed_at'
      )
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

    // Получить прогресс по категориям
    const categoryProgress = await knex('categories')
      .leftJoin('questions', 'categories.id', 'questions.category_id')
      .leftJoin('assessment_responses', function() {
        this.on('questions.id', '=', 'assessment_responses.question_id')
            .andOn('assessment_responses.respondent_id', '=', String(respondentId));
      })
      .where('questions.is_active', true)
      .groupBy('categories.id', 'categories.name', 'categories.color')
      .orderBy('categories.id');
    
    const totalCount = Number(totalQuestions?.count || 0);
    const answeredCount = Number(answeredQuestions?.count || 0);
    
    const progressPercentage = totalCount > 0 
      ? Math.round((answeredCount / totalCount) * 100)
      : 0;

    res.json({
      respondent,
      progress: {
        totalQuestions: totalCount,
        answeredQuestions: answeredCount,
        progressPercentage,
        categoryProgress
      }
    });
  } catch (error) {
    console.error('Ошибка получения прогресса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 