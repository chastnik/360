// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Получить все вопросы
router.get('/', authenticateToken, async (req: any, res: any): Promise<void> => {
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
    console.error('Ошибка получения вопросов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новый вопрос (только админы)
router.post('/', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const {
      text,
      description,
      category_id,
      type,
      min_value = 1,
      max_value = 5,
      order_index = 0,
      is_active = true
    } = req.body;

    if (!text || !category_id) {
      return res.status(400).json({ error: 'Обязательные поля: text, category_id' });
    }

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
    console.error('Ошибка создания вопроса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить вопрос (только админы)
router.put('/:id', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

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

    const updateData: any = {};
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
    console.error('Ошибка обновления вопроса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Переключить статус активности вопроса (только админы)
router.patch('/:id/toggle-active', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

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
    console.error('Ошибка изменения статуса вопроса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Изменить порядок вопросов (только админы)
router.patch('/reorder', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Требуется массив вопросов' });
    }

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
    console.error('Ошибка изменения порядка вопросов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить вопрос (только админы)
router.delete('/:id', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

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
    console.error('Ошибка удаления вопроса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 