// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import { Router, Response } from 'express';
import Joi from 'joi';
import knex from '../database/connection';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Схемы валидации
const createQuestionSchema = Joi.object({
  text: Joi.string().required().min(1).max(1000).messages({
    'string.empty': 'Текст вопроса обязателен',
    'string.min': 'Текст вопроса должен содержать минимум 1 символ',
    'string.max': 'Текст вопроса не должен превышать 1000 символов',
    'any.required': 'Текст вопроса обязателен'
  }),
  description: Joi.string().allow('', null).max(2000).optional(),
  category_id: Joi.string().uuid().required().messages({
    'string.guid': 'Некорректный формат ID категории',
    'any.required': 'ID категории обязателен'
  }),
  type: Joi.string().valid('rating', 'text', 'boolean').default('rating').optional(),
  min_value: Joi.number().integer().min(0).max(10).default(1).optional(),
  max_value: Joi.number().integer().min(1).max(10).default(5).optional(),
  order_index: Joi.number().integer().min(0).default(0).optional(),
  is_active: Joi.boolean().default(true).optional()
});

const updateQuestionSchema = Joi.object({
  text: Joi.string().min(1).max(1000).optional(),
  description: Joi.string().allow('', null).max(2000).optional(),
  category_id: Joi.string().uuid().optional(),
  type: Joi.string().valid('rating', 'text', 'boolean').optional(),
  min_value: Joi.number().integer().min(0).max(10).optional(),
  max_value: Joi.number().integer().min(1).max(10).optional(),
  order_index: Joi.number().integer().min(0).optional(),
  is_active: Joi.boolean().optional()
});

const questionIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const reorderQuestionsSchema = Joi.object({
  questions: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      order_index: Joi.number().integer().min(0).required()
    })
  ).min(1).required()
});

// Получить все вопросы
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Для админов возвращаем все вопросы (включая неактивные)
    // Для обычных пользователей - только активные
    const isAdmin = req.user.role === 'admin';
    const { category_id } = req.query;
    
    let query = knex('questions')
      .select(
        'id',
        'category_id',
        'question_text as text',
        'description',
        'question_type as type',
        'min_value',
        'max_value',
        'sort_order as order_index',
        'is_active',
        'created_at',
        'updated_at'
      );

    if (!isAdmin) {
      query = query.where('is_active', true);
    }

    // Фильтрация по категории если передан category_id
    if (category_id) {
      query = query.where('category_id', category_id);
    }

    const questions = await query.orderBy('category_id').orderBy('sort_order');
    
    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка получения вопросов');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новый вопрос (только админы)
router.post('/', authenticateToken, requireAdmin, validate(createQuestionSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      text,
      description,
      category_id,
      type = 'rating',
      min_value = 1,
      max_value = 5,
      order_index = 0,
      is_active = true
    } = req.body;

    // Проверяем, что категория существует
    const categoryExists = await knex('categories')
      .where('id', category_id)
      .first();

    if (!categoryExists) {
      return res.status(400).json({ error: 'Категория не найдена' });
    }

    const [questionId] = await knex('questions')
      .insert({
        question_text: text,
        description,
        category_id,
        question_type: type,
        min_value,
        max_value,
        sort_order: order_index,
        is_active
      })
      .returning('id');

    res.json({
      success: true,
      data: { id: questionId },
      message: 'Вопрос успешно создан'
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка создания вопроса');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить вопрос (только админы)
router.put('/:id', authenticateToken, requireAdmin, validate(questionIdSchema, 'params'), validate(updateQuestionSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      text,
      description,
      category_id,
      type,
      min_value,
      max_value,
      order_index,
      is_active
    } = req.body;

    // Проверяем, что вопрос существует
    const questionExists = await knex('questions')
      .where('id', id)
      .first();

    if (!questionExists) {
      return res.status(404).json({ error: 'Вопрос не найден' });
    }

    // Если указана категория, проверяем её существование
    if (category_id) {
      const categoryExists = await knex('categories')
        .where('id', category_id)
        .first();

      if (!categoryExists) {
        return res.status(400).json({ error: 'Категория не найдена' });
      }
    }

    const updateData: Record<string, any> = {};
    if (text !== undefined) updateData.question_text = text;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (type !== undefined) updateData.question_type = type;
    if (min_value !== undefined) updateData.min_value = min_value;
    if (max_value !== undefined) updateData.max_value = max_value;
    if (order_index !== undefined) updateData.sort_order = order_index;
    if (is_active !== undefined) updateData.is_active = is_active;

    updateData.updated_at = new Date();

    await knex('questions')
      .where('id', id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Вопрос успешно обновлен'
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка обновления вопроса');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Переключить статус активности вопроса (только админы)
router.patch('/:id/toggle-active', authenticateToken, requireAdmin, validate(questionIdSchema, 'params'), validate(Joi.object({ is_active: Joi.boolean().required() })), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Проверяем, что вопрос существует
    const questionExists = await knex('questions')
      .where('id', id)
      .first();

    if (!questionExists) {
      return res.status(404).json({ error: 'Вопрос не найден' });
    }

    await knex('questions')
      .where('id', id)
      .update({
        is_active,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: `Вопрос успешно ${is_active ? 'активирован' : 'деактивирован'}`
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка изменения статуса вопроса');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Изменить порядок вопросов (только админы)
router.patch('/reorder', authenticateToken, requireAdmin, validate(reorderQuestionsSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questions } = req.body;

    // Обновляем порядок для каждого вопроса
    const transaction = await knex.transaction();
    
    try {
      for (const question of questions) {
        await transaction('questions')
          .where('id', question.id)
          .update({
            sort_order: question.order_index,
            updated_at: new Date()
          });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Порядок вопросов успешно обновлен'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error({ error }, 'Ошибка изменения порядка вопросов');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить вопрос (только админы)
router.delete('/:id', authenticateToken, requireAdmin, validate(questionIdSchema, 'params'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Проверяем, что вопрос существует
    const questionExists = await knex('questions')
      .where('id', id)
      .first();

    if (!questionExists) {
      return res.status(404).json({ error: 'Вопрос не найден' });
    }

    // Проверяем, не используется ли вопрос в ответах
    const responsesCount = await knex('assessment_responses')
      .where('question_id', id)
      .count('id as count')
      .first();

    if (responsesCount && parseInt(responsesCount.count as string) > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить вопрос, который используется в оценках' 
      });
    }

    await knex('questions')
      .where('id', id)
      .del();

    res.json({
      success: true,
      message: 'Вопрос успешно удален'
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка удаления вопроса');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 