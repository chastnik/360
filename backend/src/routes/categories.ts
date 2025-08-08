/* eslint-disable no-console */
import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Получить все категории
router.get('/', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    // Для админов возвращаем все категории (включая неактивные)
    // Для обычных пользователей - только активные
    const isAdmin = req.user.role === 'admin';
    
    let query = knex('categories')
      .select(
        'id',
        'name',
        'description',
        'icon',
        'color',
        'sort_order',
        'is_active',
        'created_at',
        'updated_at'
      );

    if (!isAdmin) {
      query = query.where('is_active', true);
    }

    const categories = await query.orderBy('sort_order').orderBy('name');
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новую категорию (только админы)
router.post('/', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const {
      name,
      description,
      icon,
      color = '#3B82F6',
      sort_order = 0,
      is_active = true
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Обязательное поле: name' });
    }

    // Проверяем уникальность названия
    const existingCategory = await knex('categories')
      .where('name', name)
      .first();

    if (existingCategory) {
      return res.status(400).json({ error: 'Категория с таким названием уже существует' });
    }

    const [categoryId] = await knex('categories')
      .insert({
        name,
        description,
        icon,
        color,
        sort_order,
        is_active
      })
      .returning('id');

    res.json({
      success: true,
      data: { id: categoryId },
      message: 'Категория успешно создана'
    });
  } catch (error) {
    console.error('Ошибка создания категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить категорию (только админы)
router.put('/:id', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { id } = req.params;
    const {
      name,
      description,
      icon,
      color,
      sort_order,
      is_active
    } = req.body;

    // Проверяем, что категория существует
    const categoryExists = await knex('categories')
      .where('id', id)
      .first();

    if (!categoryExists) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    // Если изменяется название, проверяем уникальность
    if (name && name !== categoryExists.name) {
      const nameExists = await knex('categories')
        .where('name', name)
        .where('id', '!=', id)
        .first();

      if (nameExists) {
        return res.status(400).json({ error: 'Категория с таким названием уже существует' });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    updateData.updated_at = new Date();

    await knex('categories')
      .where('id', id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Категория успешно обновлена'
    });
  } catch (error) {
    console.error('Ошибка обновления категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Переключить статус активности категории (только админы)
router.patch('/:id/toggle-active', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { id } = req.params;
    const { is_active } = req.body;

    // Проверяем, что категория существует
    const categoryExists = await knex('categories')
      .where('id', id)
      .first();

    if (!categoryExists) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    await knex('categories')
      .where('id', id)
      .update({
        is_active,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: `Категория успешно ${is_active ? 'активирована' : 'деактивирована'}`
    });
  } catch (error) {
    console.error('Ошибка изменения статуса категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Изменить порядок категорий (только админы)
router.patch('/reorder', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'Требуется массив категорий' });
    }

    // Обновляем порядок для каждой категории
    const transaction = await knex.transaction();
    
    try {
      for (const category of categories) {
        await transaction('categories')
          .where('id', category.id)
          .update({
            sort_order: category.sort_order,
            updated_at: new Date()
          });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Порядок категорий успешно обновлен'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка изменения порядка категорий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить категорию (только админы)
router.delete('/:id', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { id } = req.params;

    // Проверяем, что категория существует
    const categoryExists = await knex('categories')
      .where('id', id)
      .first();

    if (!categoryExists) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    // Проверяем, не используется ли категория в вопросах
    const questionsCount = await knex('questions')
      .where('category_id', id)
      .count('id as count')
      .first();

    if (questionsCount && parseInt(questionsCount.count as string) > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить категорию, в которой есть вопросы' 
      });
    }

    await knex('categories')
      .where('id', id)
      .del();

    res.json({
      success: true,
      message: 'Категория успешно удалена'
    });
  } catch (error) {
    console.error('Ошибка удаления категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 